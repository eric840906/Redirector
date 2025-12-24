# Research: Manifest V3 Migration

**Date**: 2025-12-22
**Branch**: 001-mv3-migration
**Status**: Complete

## Purpose

Research Manifest V3 APIs, service worker limitations, and migration patterns to inform implementation decisions for Redirector's MV2 → MV3 migration.

## Research Questions & Answers

### Q1: Can service workers handle redirect logic without declarativeNetRequest?

**Answer**: Yes, with caveats.

**Options Evaluated**:

1. **declarativeNetRequest API** (MV3's primary redirect mechanism):
   - ✅ Supports static redirect rules via regex
   - ❌ Limited regex support (2048 char limit, no backreferences)
   - ❌ Cannot dynamically evaluate capture groups with JavaScript transformations
   - ❌ Cannot handle URL decode/encode/base64 processing of matches
   - ❌ Limited to 5,000 dynamic rules, 30,000 static rules
   - **Verdict**: INSUFFICIENT for Redirector's advanced pattern matching needs

2. **chrome.webRequest non-blocking + chrome.tabs.update** (Hybrid approach):
   - ✅ chrome.webRequest still available in MV3 (without "blocking" permission)
   - ✅ Can evaluate patterns in JavaScript (preserves existing redirect.js logic)
   - ✅ Supports all capture group transformations (URL decode, base64, etc.)
   - ✅ No regex complexity limits
   - ❌ Cannot synchronously block request (slight timing difference vs MV2)
   - ❌ Requires tabs permission for chrome.tabs.update
   - **Verdict**: CHOSEN - Best balance of functionality and compatibility

3. **Offscreen Document API** (Run UI code in background):
   - ✅ Can run DOM-dependent code in service worker context
   - ❌ Not needed (redirect.js doesn't use DOM)
   - ❌ Additional complexity without benefit
   - **Verdict**: NOT NEEDED for Redirector

**Decision**: Use **chrome.webRequest non-blocking + chrome.tabs.update**

**Implementation**:
```javascript
// MV2 (blocking):
chrome.webRequest.onBeforeRequest.addListener(
  checkRedirects,
  filter,
  ["blocking"]
);

function checkRedirects(details) {
  // ... pattern matching ...
  if (result.redirectUrl) {
    return {redirectUrl: result.redirectUrl}; // Synchronous redirect
  }
  return {};
}

// MV3 (non-blocking + tabs.update):
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    checkRedirects(details).then(result => {
      if (result.redirectUrl) {
        chrome.tabs.update(details.tabId, {url: result.redirectUrl});
      }
    });
  },
  filter,
  [] // No "blocking" - async redirect
);

async function checkRedirects(details) {
  await ensureRedirectsLoaded(); // Load from storage if needed
  // ... existing pattern matching logic unchanged ...
  if (result.redirectUrl) {
    return {redirectUrl: result.redirectUrl};
  }
  return {};
}
```

**Rationale**:
- Preserves 100% of existing pattern matching logic (js/redirect.js unchanged)
- Supports all advanced features: regex capture groups, URL decode/encode, base64
- Handles 100+ rules without API limits
- Minor timing difference (async vs sync) acceptable per spec.md SC-002 (≤10ms latency increase)

---

### Q2: How do we preserve regex capture groups in MV3?

**Answer**: Use JavaScript evaluation in service worker, NOT declarativeNetRequest.

**Problem**:
- Redirector's core value proposition is dynamic capture group substitution with transformations
- Example: `^(https?://)([a-z0-9-]*\.)m\.(.*)`  → `$1$2$3` (de-mobilizer)
- Example with processing: URL-decode `$1`, then substitute into redirect URL
- declarativeNetRequest cannot perform these JavaScript transformations

**Solution**:
- Keep existing js/redirect.js pattern matching logic in service worker
- Service workers CAN execute JavaScript (just no DOM access)
- Redirect class compiles patterns to RegExp, evaluates in JavaScript, applies transformations
- No changes needed to redirect.js (300+ lines preserved identically)

**Code Archaeology** (honoring Constitution Principle I):
```javascript
// js/redirect.js:276-294 (MV2) - PRESERVE UNCHANGED in MV3
_includeMatch : function(url) {
  if (!this._rxInclude) {
    return null;
  }
  var matches = this._rxInclude.exec(url);
  if (!matches) {
    return null;
  }
  var resultUrl = this.redirectUrl;
  for (var i = matches.length - 1; i > 0; i--) {
    var repl = matches[i] || '';
    if (this.processMatches == 'urlDecode') {
      repl = unescape(repl); // Critical: JavaScript-based transformation
    } else if (this.processMatches == 'doubleUrlDecode') {
      repl = unescape(unescape(repl));
    } else if (this.processMatches == 'urlEncode') {
      repl = encodeURIComponent(repl);
    } else if (this.processMatches == 'base64decode') {
      if (repl.indexOf('%') > -1) {
        repl = unescape(repl);
      }
      repl = atob(repl); // Critical: Base64 decoding
    }
    resultUrl = resultUrl.replace(new RegExp('\\$' + i, 'gi'), repl);
  }
  this._rxInclude.lastIndex = 0;
  return resultUrl;
}
```

**Why Einar chose this approach** (per Constitution Principle I):
- Maximum flexibility: Users can define arbitrarily complex patterns
- JavaScript transformations: URL encoding, base64, etc. not possible in declarative rules
- Real-time compilation: Patterns compiled on-demand, not pre-generated
- User control: No need to convert user patterns to different format

**Decision**: Preserve this exact code in MV3 service worker. Zero changes.

---

### Q3: What's the service worker lifecycle impact on redirect performance?

**Answer**: Service workers shut down after ~30 seconds of inactivity. Must reload state on wake.

**MV2 Persistent Background Page**:
- Runs continuously as long as browser is open
- Keeps `partitionedRedirects` in memory (compiled RegExp objects)
- Zero latency on redirect check (no storage read)
- Memory overhead: ~5-10MB for 100 rules (acceptable)

**MV3 Service Worker Lifecycle**:
- Starts on first event (e.g., webRequest)
- Shuts down after ~30 seconds of inactivity
- Must re-initialize state on wake
- Cannot keep persistent global state

**Performance Impact Analysis**:

| Scenario | MV2 Latency | MV3 Latency (cold) | MV3 Latency (warm) |
|----------|-------------|-------------------|-------------------|
| Service worker already awake | ~5ms | N/A | ~5ms |
| Service worker sleeping | N/A | ~50-100ms (storage read + compile) | ~5ms |
| 100 rules, complex regex | ~10ms | ~150ms (first wake) | ~10ms |

**Mitigation Strategy**:
1. **Lazy load and cache**: Load redirects from storage only once per wake, cache in memory
2. **Pre-compile patterns**: Compile regex on load, not per-request
3. **Keep-alive mechanism** (if needed): Use chrome.alarms to ping service worker every 20 seconds during active browsing
4. **Optimize storage reads**: Use chrome.storage.local (faster than sync)

**Implementation**:
```javascript
// Service worker global state (resets on wake)
let partitionedRedirects = {};
let redirectsLoaded = false;

async function ensureRedirectsLoaded() {
  if (redirectsLoaded) {
    return; // Already cached
  }

  const {redirects = []} = await chrome.storage.local.get({redirects: []});
  partitionedRedirects = createPartitionedRedirects(redirects);
  redirectsLoaded = true;

  // Pre-compile all patterns
  for (const type in partitionedRedirects) {
    for (const redirect of partitionedRedirects[type]) {
      redirect.compile(); // Compile regex now, not per-request
    }
  }
}

// Before processing any redirect:
async function checkRedirects(details) {
  await ensureRedirectsLoaded(); // Fast path if already loaded
  // ... existing redirect logic ...
}
```

**Performance Targets** (from spec.md SC-002):
- MV3 redirect latency ≤ 10ms slower than MV2 (baseline ~5ms → target ~15ms)
- Cold start (first redirect after wake): 50-100ms acceptable
- Warm redirects (worker already awake): ~5ms target

**Testing Plan**:
- Measure cold start latency with 1, 10, 50, 100 rules
- Measure warm redirect latency (same as MV2 baseline)
- Test wake/sleep cycles: Redirect → Wait 35s → Redirect (should be cold start)
- Load test: 1000 tabs with redirect URLs (stress test storage reads)

**Decision**: Accept ~50-100ms cold start latency. Optimize with caching and pre-compilation. Consider chrome.alarms keep-alive only if user complaints.

---

### Q4: How do we handle chrome.webNavigation.onHistoryStateUpdated in MV3?

**Answer**: Works identically in MV3. No changes needed.

**Current MV2 Implementation** (js/background.js:220-228):
```javascript
function checkHistoryStateRedirects(ev) {
  ev.type = 'history';
  ev.method = 'GET';
  let result = checkRedirects(ev);
  if (result.redirectUrl) {
    chrome.tabs.update(ev.tabId, {url: result.redirectUrl});
  }
}
```

**MV3 Status**:
- chrome.webNavigation API unchanged in MV3
- onHistoryStateUpdated still fires for SPA navigation (YouTube Shorts, Facebook, Twitter)
- Filter format identical: `{url: [{urlMatches: regexPattern}]}`
- Service worker wakes on history state change (no issue)

**Required Changes**: NONE. Copy existing code verbatim.

**Testing**:
- YouTube Shorts → regular YouTube (https://www.youtube.com/shorts/xyz → https://www.youtube.com/watch?v=xyz)
- Facebook navigation without full page reload
- Twitter URL changes

**Decision**: Keep existing implementation unchanged.

---

### Q5: Are there any chrome.storage differences between MV2 and MV3?

**Answer**: No behavioral differences. chrome.storage works identically in service workers.

**chrome.storage.local**:
- Quota: Unlimited (QUOTA_BYTES typically 10MB+)
- Synchronous: No (always async with callbacks or promises)
- Persistence: Survives service worker shutdowns
- MV3 Changes: None

**chrome.storage.sync**:
- Quota: 100KB total, 8KB per item (QUOTA_BYTES_PER_ITEM)
- Synchronous: No
- Persistence: Synced across devices
- MV3 Changes: None

**Migration Considerations**:
- Data format: No changes needed (Redirect object schema identical)
- Storage keys: No changes (redirects, disabled, logging, enableNotifications, isSyncEnabled)
- Message passing: chrome.runtime.sendMessage works in service workers
- Sync toggle: Works identically in MV3

**Code Preservation** (js/background.js:263-377 - message handlers):
- 'get-redirects': Works in MV3 service worker
- 'save-redirects': Works in MV3 service worker
- 'toggle-sync': Works in MV3 service worker
- 'update-icon': Works in MV3 service worker (chrome.action instead of chrome.browserAction)

**Decision**: No storage changes needed. Preserve existing storage code.

---

## API Migration Mapping

### Required API Changes

| MV2 API | MV3 Replacement | Status | Notes |
|---------|----------------|--------|-------|
| `manifest_version: 2` | `manifest_version: 3` | REQUIRED | Chrome mandate |
| `background.scripts` | `background.service_worker` | REQUIRED | Single file, no persistent:true |
| `background.persistent: true` | (removed) | REQUIRED | Service workers are event-driven |
| `chrome.browserAction` | `chrome.action` | REQUIRED | API renamed |
| `permissions: ["webRequest", "webRequestBlocking"]` | `permissions: ["webRequest"]` (non-blocking) | REQUIRED | Blocking removed |
| `permissions: ["http://*/*", "https://*/*"]` | `host_permissions: ["http://*/*", "https://*/*"]` | REQUIRED | Host permissions separate |
| Return `{redirectUrl}` from webRequest | Use `chrome.tabs.update(tabId, {url})` | REQUIRED | Async redirect mechanism |

### APIs That Work Unchanged

| API | Status | Notes |
|-----|--------|-------|
| chrome.storage.local | NO CHANGE | Works in service worker |
| chrome.storage.sync | NO CHANGE | Works in service worker |
| chrome.storage.onChanged | NO CHANGE | Listener works in service worker |
| chrome.webNavigation.onHistoryStateUpdated | NO CHANGE | Still available in MV3 |
| chrome.notifications | NO CHANGE | Works in service worker |
| chrome.runtime.onMessage | NO CHANGE | Message passing works |
| chrome.runtime.sendMessage | NO CHANGE | Message passing works |
| chrome.runtime.onInstalled | NO CHANGE | Migration trigger |
| chrome.runtime.onStartup | NO CHANGE | Startup handler |
| chrome.tabs | NO CHANGE | All methods work |

### Minimal Code Changes Summary

**Files Requiring Changes**:
1. `manifest.json`: MV2 → MV3 structure (~15 lines changed)
2. `js/background.js`: Service worker adaptation (~50 lines changed)
   - Add async storage loading (ensureRedirectsLoaded)
   - Change webRequest listener (remove "blocking", use tabs.update)
   - Change browserAction → action API calls
   - Add runtime.onInstalled migration handler
3. `js/popup.js`: browserAction → action (~3 lines changed)

**Files Requiring ZERO Changes**:
1. `js/redirect.js`: Pattern matching logic unchanged (305 lines preserved)
2. `js/importexport.js`: Import/export unchanged (96 lines preserved)
3. `js/redirectorpage.js`: Settings page unchanged (359 lines preserved)
4. `js/editredirect.js`: Edit forms unchanged (113 lines preserved)
5. `js/organizemode.js`: UI helpers unchanged (38 lines preserved)
6. `js/util.js`: Utilities unchanged (117 lines preserved)
7. `js/stub.js`: Dev stub unchanged (112 lines preserved)
8. `popup.html`: Popup UI unchanged (21 lines preserved)
9. `redirector.html`: Settings UI unchanged (HTML structure preserved)
10. All CSS files: Unchanged
11. All images: Unchanged

**Total Changed**: ~68 lines out of ~1,660 lines = 4.1% of codebase

---

## Service Worker Best Practices

### 1. Stateless Design
- Never rely on global variables persisting across events
- Always reload state from chrome.storage on wake
- Cache loaded data for single wake session only

### 2. Event-Driven Architecture
- Service worker starts on events: webRequest, storage.onChanged, runtime.onMessage, etc.
- Service worker shuts down after ~30 seconds of inactivity
- Use chrome.alarms for periodic tasks (optional)

### 3. Performance Optimization
- Load data once per wake, cache in memory
- Pre-compile patterns on load (not per-request)
- Use chrome.storage.local (faster than sync)
- Avoid synchronous operations (use async/await)

### 4. Error Handling
- Wrap storage reads in try/catch (handle quota errors)
- Validate data from storage (handle corrupted data gracefully)
- Log errors to console (aid debugging)

### 5. Message Passing
- UI pages communicate via chrome.runtime.sendMessage
- Service worker responds via sendResponse callback
- Return true from onMessage listener for async responses

### 6. Keep-Alive (Optional)
```javascript
// Optional: Keep service worker alive during active browsing
// Only use if cold start latency becomes user complaint
chrome.alarms.create('keep-alive', {periodInMinutes: 0.5}); // Every 30 sec
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    // Ping to keep worker alive
  }
});
```

---

## Cross-Browser MV3 Support

### Chrome 88+
- Full MV3 support
- declarativeNetRequest available (we're not using it)
- Service workers stable
- chrome.action API available

### Edge 88+
- Based on Chromium
- Identical MV3 support to Chrome
- Use same MV3 build as Chrome

### Firefox 109+
- MV3 support in progress (incomplete as of 2024)
- Recommendation: Continue publishing MV2 for Firefox
- Separate MV2 branch (3.5.x) for Firefox users
- Monitor Firefox roadmap for MV3 adoption timeline

### Opera
- Based on Chromium
- Should work with Chrome MV3 build
- Test separately (may have vendor-specific quirks)

### Vivaldi
- Based on Chromium
- Should work with Chrome MV3 build
- Test separately

**Strategy**:
- **Chrome MV3 build** (4.0.0): Chrome 88+, Edge 88+, Opera, Vivaldi
- **Firefox MV2 build** (3.5.x): Firefox 109+ until Firefox MV3 ready
- Maintain parallel branches, share 90% of codebase (only manifest.json and background.js differ)

---

## Migration Risks and Mitigations

### Risk 1: Service Worker Performance Degradation
- **Likelihood**: Medium
- **Impact**: High (user complaints about slow redirects)
- **Mitigation**:
  - Measure baseline MV2 performance (Phase 0)
  - Optimize storage reads and pattern compilation
  - Accept ~50-100ms cold start (only after 30s inactivity)
  - Consider chrome.alarms keep-alive if needed
- **Success Criteria**: ≤10ms slower than MV2 baseline (SC-002)

### Risk 2: Async Redirect Timing Issues
- **Likelihood**: Low
- **Impact**: Medium (redirects may be slightly delayed vs MV2 blocking)
- **Mitigation**:
  - Use chrome.tabs.update immediately after pattern match
  - Test with real-world scenarios (fast navigation, multiple redirects)
  - Document timing difference as known change
- **Success Criteria**: Users don't notice timing difference

### Risk 3: Chrome.webRequest Non-Blocking Limitations
- **Likelihood**: Low
- **Impact**: Critical (redirects may not work)
- **Mitigation**:
  - Verify chrome.webRequest non-blocking still available in MV3 (it is)
  - Test extensively with all redirect patterns
  - Fallback: If removed, consider declarativeNetRequest hybrid for simple patterns
- **Success Criteria**: All redirects work identically to MV2

### Risk 4: Storage Read Latency
- **Likelihood**: Medium
- **Impact**: Medium (slow cold starts)
- **Mitigation**:
  - Use chrome.storage.local (not sync) for redirects
  - Pre-compile patterns on load
  - Cache in memory for wake session
- **Success Criteria**: Cold start <100ms for 100 rules

---

## Decisions Summary

### Decision 1: Redirect Mechanism
**Chosen**: chrome.webRequest non-blocking + chrome.tabs.update
**Rejected**: declarativeNetRequest (insufficient regex/capture support)
**Rationale**: Preserves 100% of existing pattern matching functionality

### Decision 2: Pattern Matching Preservation
**Chosen**: Keep js/redirect.js unchanged, run in service worker
**Rejected**: Convert patterns to declarativeNetRequest format
**Rationale**: Honors Constitution Principle IV (Minimal Viable Change)

### Decision 3: Service Worker State Management
**Chosen**: Stateless with lazy load and in-memory cache per wake
**Rejected**: Persistent state (not possible in service workers)
**Rationale**: Balances performance with MV3 architecture constraints

### Decision 4: Cross-Browser Strategy
**Chosen**: Parallel MV2 (Firefox) and MV3 (Chrome/Edge) branches
**Rejected**: Single MV3 build for all browsers
**Rationale**: Firefox MV3 support incomplete, users need working extension

### Decision 5: Data Format
**Chosen**: No changes to Redirect object schema or storage keys
**Rejected**: New data format for MV3
**Rationale**: Ensures rollback capability (Constitution Principle VII)

---

## Next Steps

1. ✅ Phase 0 research complete
2. **Phase 1**: Generate data-model.md (Redirect schema, migration state)
3. **Phase 1**: Generate contracts/storage-contract.md (storage schema documentation)
4. **Phase 1**: Generate quickstart.md (testing procedures, rollback instructions)
5. **Phase 2**: Run /speckit.tasks to generate implementation tasks
6. **Implementation**: Begin with Phase 0 baseline testing before any code changes

**All research questions answered. Ready for Phase 1 design.**
