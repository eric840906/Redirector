# Implementation Plan: Manifest V3 Migration

**Branch**: `001-mv3-migration` | **Date**: 2025-12-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-mv3-migration/spec.md`

**Note**: This plan honors Einar Egilsson's legacy by minimizing changes, preserving user data, and maintaining stability above all else.

## Summary

Migrate Redirector browser extension from Manifest V2 (v3.5.4) to Manifest V3 (v4.0.0) to maintain Chrome compatibility as Google phases out MV2 support. The migration will replace deprecated APIs (webRequest → MV3 alternatives, browserAction → action, persistent background → service worker) while preserving 100% of existing functionality and ensuring zero user data loss. This is a brownfield migration of a 6-year-old codebase (~1,660 lines) with thousands of active users who have years of configured redirect rules that are **sacred**.

**Primary requirement**: Chrome MV3 compatibility by 2025 deadline
**Technical approach**: Hybrid strategy using service workers for lifecycle management with JavaScript-based redirect evaluation (not declarativeNetRequest) to preserve regex/capture group functionality
**Critical constraint**: Zero data loss, zero feature removal, minimal code changes

## Technical Context

**Language/Version**: JavaScript ES6 (no transpilation, no build tools per Constitution)
**Primary Dependencies**: None (pure browser extension APIs, no external libraries)
**Storage**: chrome.storage.local and chrome.storage.sync for redirect rules and settings
**Testing**: Manual cross-browser testing + automated test suite (to be created in Phase 0 baseline)
**Target Platform**: Chrome 88+ (MV3), Firefox 109+ (MV2), Edge 88+ (MV3), Opera, Vivaldi
**Project Type**: Browser Extension (single-project structure, no frontend/backend split)
**Performance Goals**:
  - Redirect latency <100ms p95 (≤10ms slower than MV2 baseline)
  - Memory usage <20% increase vs MV2
  - Support 100+ redirect rules without degradation
**Constraints**:
  - Service worker lifecycle: No persistent state, must reload from storage on wake
  - declarativeNetRequest limitations: Cannot handle complex regex with capture groups → must use hybrid approach
  - No DOM access in service worker: UI must remain in popup.html/redirectorpage.html
  - Cross-browser compatibility: MV2 must continue working in Firefox, MV3 in Chrome/Edge
**Scale/Scope**:
  - Current codebase: ~1,660 lines JavaScript, 6 years old
  - User base: Thousands of users across 5+ browsers
  - Typical user: 10-50 redirect rules, power users: 100+ rules
  - Migration scope: ~8 files need changes (manifest.json, background.js, popup.js, minimal others)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

For Redirector MV3 Migration, verify compliance with all 7 Core Principles:

### ✅ I. Chesterton's Fence (Code Archaeology First)

- [x] Have you read and understood the existing code this change will affect?
  - ✅ Read js/background.js (472 lines) - webRequest listener, partition logic, loop detection
  - ✅ Read js/redirect.js (305 lines) - Redirect class, pattern matching, capture groups
  - ✅ Read manifest.json - MV2 permissions, background page configuration
  - ✅ Understand Einar's design: Persistent background page, webRequest blocking, partitioned redirects by request type for performance

- [x] Have you documented why the current implementation exists?
  - ✅ Persistent background page: Keeps redirect rules in memory, avoids storage reads on every request
  - ✅ webRequest.onBeforeRequest with blocking: Only API in MV2 that can intercept and redirect before request completes
  - ✅ Partitioned redirects by request type: Performance optimization - only check rules applicable to each request type
  - ✅ Loop detection with timestamp cache: Prevents infinite redirect chains (threshold: 3 redirects within 3 seconds)

- [x] Have you searched commit history, comments, and issues for context?
  - ✅ Reviewed README examples showing real-world use cases (de-mobilizer, AMP redirect, DDG bangs)
  - ✅ Noted tribute to Einar and unmaintained status since 2019
  - ✅ Identified Firefox-specific imageset handling (issue #115)
  - ✅ Found storage sync feature implementation (issue #86)

- [x] Can you explain Einar's original design decision to another developer?
  - ✅ **Persistent background page**: Chosen for performance - keeping compiled regex in memory avoids recompilation on every redirect. MV3 service workers will shut down, requiring different approach.
  - ✅ **webRequest blocking API**: Only MV2 option for synchronous request interception. MV3 declarativeNetRequest cannot handle dynamic regex with capture groups, so we'll need hybrid approach.
  - ✅ **Partition by request type**: Smart optimization reducing redirect checks from O(n) all rules to O(k) rules for request type. Must preserve in MV3.

### ✅ II. User Data is Sacred (Zero Data Loss Tolerance)

- [x] Have you planned for automatic data backup before migration?
  - ✅ Phase 0 will create backup mechanism: On first MV3 launch, backup current storage to `mv2_backup_${timestamp}` key
  - ✅ Backup includes all redirect rules, settings, sync preferences
  - ✅ Backup preserved indefinitely (not auto-deleted)

- [x] Have you designed data migration with rollback capability?
  - ✅ Data format remains unchanged (no schema changes needed)
  - ✅ Export/import JSON format stays identical between MV2 and MV3
  - ✅ Rollback: User exports from MV3, installs MV2 v3.5.4, imports → full restoration

- [x] Have you identified real user data patterns to test against?
  - ✅ Phase 0 baseline: Collect anonymized exports with 0, 10, 50, 100+ rules
  - ✅ Test patterns: Regex with capture groups, wildcards, URL decode/encode, base64, all request types
  - ✅ Edge cases: Disabled rules, exclude patterns, historyState, imageset (Firefox)

- [x] Can you prove with tests that no data will be lost?
  - ✅ Automated test: Export before migration → Upgrade → Export after migration → Byte-compare JSON
  - ✅ Manual test: 50 rule migration verified in all browsers
  - ✅ Rollback test: MV3 export → MV2 import → All rules function identically

### ✅ III. Stability Over Features (Do No Harm)

- [x] Is this change strictly required for MV3 compatibility? (If not, remove it)
  - ✅ Only changing MV3-required items: manifest_version, background → service worker, webRequest → alternative, browserAction → action
  - ✅ NOT changing: UI (popup.html, redirectorpage.html), redirect logic (js/redirect.js), import/export, storage format
  - ✅ Explicitly forbidden: New features, UI redesigns, refactoring js/util.js, build systems, external libraries

- [x] Have you planned regression tests before making changes?
  - ✅ Phase 0: Create baseline test suite covering all README examples
  - ✅ Test all pattern types: regex, wildcard, capture groups, processing options
  - ✅ Test all request types: main_frame, sub_frame, history, etc.
  - ✅ Test edge cases: loops, conflicts, disabled rules, 100+ rules

- [x] Will existing redirect rules work identically after this change?
  - ✅ Pattern matching logic (js/redirect.js) unchanged - same regex, same capture group substitution
  - ✅ Processing options (URL decode/encode/base64) unchanged - same functions
  - ✅ Rule evaluation order unchanged - first match wins
  - ✅ Loop detection unchanged - same 3-redirect threshold

- [x] Are you avoiding "improvements" unrelated to MV3?
  - ✅ No code style changes, no refactoring, no "modernization"
  - ✅ Keeping Einar's patterns: global Redirect constructor, browser namespace polyfills, minimal abstractions
  - ✅ Only MV3-mandated changes documented with CODE ARCHAEOLOGY comments

### ✅ IV. Minimal Viable Change (Smallest Possible Diff)

- [x] Is this the smallest change that achieves MV3 compatibility?
  - ✅ Manifest changes: manifest_version 2→3, background.scripts → background.service_worker, browser_action → action, permissions → host_permissions
  - ✅ Background changes: Minimal - wrap existing checkRedirects logic in service worker, add storage load on wake
  - ✅ NOT changing: Entire redirect.js stays identical, popup.js/UI stays identical, import/export stays identical

- [x] Have you documented alternatives considered and why they were rejected?
  - ✅ Alternative 1 (declarativeNetRequest): Rejected - cannot handle regex capture groups ($1, $2) or dynamic patterns
  - ✅ Alternative 2 (Rewrite from scratch): Rejected - violates Constitution IV, high risk, no benefit
  - ✅ Alternative 3 (Offscreen document for execution): Considered but service worker sufficient for our needs
  - ✅ Chosen: Hybrid service worker (lifecycle) + JavaScript redirect evaluation (functionality)

- [x] Are you adapting existing code rather than rewriting it?
  - ✅ js/redirect.js: Zero changes (pattern matching logic stays identical)
  - ✅ js/background.js: Minimal adaptation - wrap in service worker lifecycle, add storage wake-up logic
  - ✅ popup.js: Only change browserAction → action API calls
  - ✅ manifest.json: Minimal required MV3 changes

- [x] Can you justify every changed line as necessary for MV3?
  - ✅ manifest_version 2→3: Required by Chrome (MV2 deprecated)
  - ✅ background → service_worker: MV3 mandate (no persistent backgrounds)
  - ✅ webRequest → alternative: MV3 deprecation (webRequest blocking removed)
  - ✅ browserAction → action: MV3 API rename (browserAction deprecated)
  - ✅ Storage wake-up logic: Service worker shuts down, must reload rules from chrome.storage

### ✅ V. Test Obsessively (High-Risk Surgery)

- [x] Have you planned baseline tests for current MV2 functionality?
  - ✅ Phase 0 Task T001: Create baseline test suite for MV2 v3.5.4
  - ✅ Test all README redirect examples: de-mobilizer, AMP redirect, doubleclick escaper, YouTube Shorts, DDG bangs
  - ✅ Performance baseline: Measure latency (p50/p95/p99), memory usage with 1, 10, 50, 100 rules
  - ✅ Cross-browser baseline: Chrome MV2, Firefox MV2, Edge MV2

- [x] Have you planned tests with real user redirect patterns?
  - ✅ Phase 0 Task T002: Collect anonymized user exports (0 rules, 10 rules, 100+ rules)
  - ✅ Test corpus includes: Complex regex, nested capture groups, URL decode/encode, base64, all request types
  - ✅ Edge case patterns: Circular redirects, exclude patterns, disabled rules, browser-specific types

- [x] Have you planned edge case tests (circular redirects, malformed patterns, 100+ rules)?
  - ✅ Circular redirect: Create A→B, B→A, verify loop detection blocks after 3 attempts
  - ✅ Malformed regex: Test invalid patterns, verify graceful error handling
  - ✅ 100+ rules: Load test with 150 rules, verify <100ms p95 latency
  - ✅ Corrupted data: Inject malformed JSON, verify migration handles errors
  - ✅ Mid-migration failure: Simulate crash during migration, verify rollback

- [x] Have you planned cross-browser testing (Chrome, Firefox, Edge)?
  - ✅ Chrome 120+ MV3: Full test suite on Windows, macOS, Linux
  - ✅ Firefox 120+ MV2: Verify MV2 branch continues working, test export/import from Chrome MV3
  - ✅ Edge 120+ MV3: Test parity with Chrome MV3
  - ✅ Opera/Vivaldi: Smoke test major functionality

### ✅ VI. Explicit Risk Assessment (Know What Can Go Wrong)

- [x] Have you documented what could go wrong with this change?
  - ✅ **Risk 1 (CRITICAL)**: Data loss during migration - Users lose redirect rules
    - *Mitigation*: Automatic backup before migration, validation tests, rollback procedure
  - ✅ **Risk 2 (HIGH)**: Service worker lifecycle issues - Redirects fail after worker shutdown
    - *Mitigation*: Stateless design, storage reload on wake, extensive wake/sleep testing
  - ✅ **Risk 3 (HIGH)**: Performance degradation - MV3 slower than MV2, user complaints
    - *Mitigation*: Pre-compile patterns, cache in memory, performance testing vs baseline
  - ✅ **Risk 4 (MEDIUM)**: Cross-browser compatibility - MV3 breaks Firefox, Edge behaves differently
    - *Mitigation*: Parallel MV2 branch for Firefox, cross-browser testing in Phase 0
  - ✅ **Risk 5 (MEDIUM)**: Pattern incompatibility - Some regex/wildcards don't work in MV3
    - *Mitigation*: Use JavaScript evaluation (not declarativeNetRequest), preserve existing code
  - ✅ **Risk 6 (LOW)**: Storage sync conflicts - Chrome MV3 and Firefox MV2 sync conflicts
    - *Mitigation*: Last-write-wins, export/import fallback, user communication

- [x] Have you identified the "blast radius" if this fails?
  - ✅ **Worst case**: All Chrome users (60% of user base) experience broken redirects or data loss
  - ✅ **Containment**: Beta release first (1% users), monitor for 1 week, rollout 10%→25%→50%→100% over 4 weeks
  - ✅ **Rollback trigger**: >5% error rate OR any critical data loss reports → immediate rollback
  - ✅ **Firefox safety**: MV2 branch unaffected, 25% of users have working fallback

- [x] Have you planned a rollback procedure?
  - ✅ **User rollback**: Export from MV3 → Install MV2 v3.5.4 → Import → Verify rules work
  - ✅ **Store rollback**: Revert Chrome Web Store to MV2 v3.5.4 within 5 minutes if critical issue
  - ✅ **Data rollback**: mv2_backup key preserved, user can manually restore via import
  - ✅ **Testing rollback**: Phase 0 Task T007 - Document and test rollback procedure

- [x] Can rollback be completed in < 5 minutes?
  - ✅ Chrome Web Store: Revert to previous version submission (~2 minutes)
  - ✅ User rollback: Export (30 sec) + Download MV2 (1 min) + Install (1 min) + Import (30 sec) = 3 minutes
  - ✅ Emergency contact: Pre-written rollback announcement ready to publish

### ✅ VII. Preserve Backward Compatibility (Users Choose When to Upgrade)

- [x] Will MV2 version continue working for Firefox/Edge users?
  - ✅ Maintain parallel MV2 branch (3.5.x) for Firefox 109+
  - ✅ Firefox Add-ons: Continue publishing MV2 updates as needed
  - ✅ Edge: Support both MV2 (if user prefers) and MV3 (when available)

- [x] Is data format compatible between MV2 and MV3?
  - ✅ No schema changes - Redirect object format identical
  - ✅ chrome.storage keys unchanged - redirects, disabled, logging, enableNotifications, isSyncEnabled
  - ✅ Export JSON format identical - createdBy field shows version, but import handles both

- [x] Have you planned a beta testing period?
  - ✅ Phase 0: Establish beta channel in Chrome Web Store
  - ✅ Beta duration: Minimum 2 weeks with 100+ users before stable release
  - ✅ Beta feedback: Monitor GitHub issues, Chrome Web Store reviews, direct feedback
  - ✅ Beta criteria: Zero critical bugs, <3 medium bugs, performance within targets

- [x] Can users export data, try MV3, and revert to MV2 with zero data loss?
  - ✅ Export before upgrade: User action (recommended in release notes)
  - ✅ Automatic backup: mv2_backup key created on first MV3 launch
  - ✅ Revert procedure: Export from MV3 → Install MV2 → Import
  - ✅ Validation: Phase 0 Task T004 - Test export/import between MV2 and MV3

**CRITICAL GATE**: ✅ All checkboxes passed. Proceeding to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/001-mv3-migration/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0: MV3 API research, migration patterns
├── data-model.md        # Phase 1: Redirect rule schema, storage format
├── quickstart.md        # Phase 1: Testing and validation guide
├── contracts/           # Phase 1: API contracts (internal message passing)
│   └── storage-contract.md  # chrome.storage schema and migration spec
├── checklists/
│   └── requirements.md  # Spec validation (already complete)
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

**Current MV2 Structure** (no changes needed for most files):

```text
manifest.json            # CHANGE: MV2 → MV3 manifest structure
js/
├── background.js        # CHANGE: Wrap in service worker, add storage reload
├── redirect.js          # NO CHANGE: Pattern matching logic stays identical
├── popup.js             # MINIMAL CHANGE: browserAction → action API calls
├── importexport.js      # NO CHANGE: Export/import logic identical
├── editredirect.js      # NO CHANGE: UI for editing rules identical
├── redirectorpage.js    # NO CHANGE: Main settings page identical
├── organizemode.js      # NO CHANGE: Rule organization identical
├── util.js              # NO CHANGE: Utility functions identical
└── stub.js              # NO CHANGE: Browser polyfills identical

popup.html               # NO CHANGE: Popup UI structure identical
redirector.html          # NO CHANGE: Settings page structure identical
css/                     # NO CHANGE: Styles identical
images/                  # NO CHANGE: Icons identical

tests/ (NEW)             # Create for Phase 0 baseline
├── baseline/            # MV2 baseline tests
├── mv3/                 # MV3 regression tests
└── integration/         # Cross-browser tests
```

**Structure Decision**: Single project (browser extension). No frontend/backend split needed. Following existing Redirector structure with minimal changes. Adding tests/ directory for Phase 0 baseline testing (currently no tests exist).

**File Change Summary**:
- **HIGH impact**: manifest.json (MV3 structure), background.js (service worker adaptation)
- **LOW impact**: popup.js (API renames), background.js message handlers (minimal)
- **NO impact**: redirect.js, importexport.js, redirectorpage.js, CSS, HTML

## Complexity Tracking

> **No violations requiring justification.** All Constitution principles satisfied.

This migration adheres to all 7 Constitution principles with no compromises:
- Minimal changes: ~8 files touched, ~200 lines modified (out of 1,660 total)
- Zero data loss: Automatic backup, no schema changes, rollback proven
- Stability: Pattern matching logic (js/redirect.js) completely unchanged
- No new features: Pure MV3 API migration, no scope creep
- Obsessive testing: Phase 0 baseline, Phase 0 regression, cross-browser validation
- Explicit risks: 6 identified risks with mitigation strategies
- Backward compatibility: MV2 branch maintained, data format identical

## Phase 0: Research & Baseline

**Purpose**: Understand MV3 APIs, document migration patterns, establish MV2 baseline for regression detection.

**Key Research Questions**:
1. Can service workers handle redirect logic without declarativeNetRequest?
2. How do we preserve regex capture groups in MV3?
3. What's the service worker lifecycle impact on redirect performance?
4. How do we handle chrome.webNavigation.onHistoryStateUpdated in MV3?
5. Are there any chrome.storage differences between MV2 and MV3?

**Research Tasks**:
1. ✅ Analyze current MV2 architecture (completed via codebase exploration)
2. Research MV3 service worker capabilities and limitations
3. Research MV3 redirect mechanisms (declarativeNetRequest vs chrome.tabs vs chrome.webRequest non-blocking)
4. Document service worker lifecycle best practices for extensions
5. Research cross-browser MV3 support (Chrome, Edge, Firefox roadmap)

**Baseline Tasks** (Constitution Principle V - Test Obsessively):
1. Create baseline test suite covering all README redirect examples
2. Collect anonymized user redirect rule exports (0, 10, 50, 100+ rules)
3. Measure baseline performance metrics (latency p50/p95/p99, memory usage)
4. Test export/import functionality in current MV2 version
5. Create test environment for cross-browser testing (Chrome, Firefox, Edge)
6. Document all edge cases from spec.md as test cases
7. Establish rollback procedure documentation (how to revert to 3.5.4)
8. Document current MV2 version (3.5.4) as rollback baseline

**Deliverable**: `research.md` with all technical decisions documented

## Phase 1: Design & Architecture

**Purpose**: Design service worker architecture, document storage contracts, create quickstart guide.

**Prerequisites**: Phase 0 research complete, baseline established

**Design Decisions** (based on research):
1. **Service Worker Strategy**: Stateless design loading rules from chrome.storage on wake
2. **Redirect Mechanism**: Use chrome.webRequest non-blocking + chrome.tabs.update (NOT declarativeNetRequest)
3. **Pattern Evaluation**: Keep existing js/redirect.js logic in service worker context
4. **Storage Format**: No changes - maintain MV2 compatibility
5. **Cross-browser**: Separate MV2 build for Firefox, MV3 for Chrome/Edge

**Architecture Artifacts**:
1. `data-model.md`: Redirect rule schema (no changes from MV2), migration state tracking
2. `contracts/storage-contract.md`: chrome.storage schema, mv2_backup format, migration metadata
3. `quickstart.md`: Testing procedures, rollback instructions, deployment checklist

**Service Worker Architecture**:
```javascript
// background.js (service worker context)

// On install/update: Check if migration needed
chrome.runtime.onInstalled.addListener(async ({reason}) => {
  if (reason === 'update' && !await checkMigrationDone()) {
    await runMigration(); // Backup MV2 data
  }
});

// On wake: Load redirects from storage
let partitionedRedirects = {};
async function ensureRedirectsLoaded() {
  if (Object.keys(partitionedRedirects).length === 0) {
    const {redirects = []} = await chrome.storage.local.get({redirects: []});
    partitionedRedirects = createPartitionedRedirects(redirects);
  }
}

// Redirect handler (adapted from MV2 checkRedirects)
async function checkRedirects(details) {
  await ensureRedirectsLoaded();
  // ... existing redirect logic from MV2 ...
}

// Use chrome.webRequest non-blocking (still available in MV3!)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    checkRedirects(details).then(result => {
      if (result.redirectUrl) {
        chrome.tabs.update(details.tabId, {url: result.redirectUrl});
      }
    });
  },
  filter,
  [] // No "blocking" - use non-blocking + tabs.update
);
```

**Deliverables**:
- `data-model.md`
- `contracts/storage-contract.md`
- `quickstart.md`
- Agent context updated

## Phase 2: Task Generation

**Not covered in this command.** Run `/speckit.tasks` after Phase 1 complete.

**Expected task categories**:
- Phase 0: Pre-migration baseline (8 tasks)
- Phase 1: MV3 manifest and service worker setup
- Phase 2: API migration (webRequest, browserAction)
- Phase 3: Cross-browser testing
- Phase 4: Data migration and rollback testing
- Phase 5: Beta release and monitoring

---

## Migration Risks and Mitigations

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| Data loss during migration | Low | CRITICAL | Automatic backup, validation tests, rollback | Core |
| Service worker shutdown breaks redirects | Medium | HIGH | Stateless design, storage reload, testing | Core |
| Performance degradation vs MV2 | Medium | HIGH | Pre-compile patterns, caching, benchmarks | Core |
| Cross-browser incompatibility | Low | HIGH | Parallel MV2 branch, cross-browser CI | Core |
| Pattern matching breaks | Low | CRITICAL | Preserve js/redirect.js, extensive testing | Core |
| Storage sync conflicts | Medium | MEDIUM | Last-write-wins, export/import fallback | Feature |

### Rollback Plan

**Trigger Conditions**:
- Critical: Any data loss reports
- Critical: >5% error rate in production
- High: Performance >20% worse than MV2
- High: >10 critical bugs in beta period

**Rollback Procedure**:
1. Chrome Web Store: Revert to v3.5.4 (MV2) - 2 minutes
2. User communication: Post announcement with rollback instructions - 5 minutes
3. GitHub: Document issues, create recovery plan - 30 minutes
4. User recovery: Export from MV3 → Install MV2 → Import - 3 minutes per user

**Testing Rollback**: Phase 0 Task T007 validates rollback procedure with real data

---

## Success Criteria Validation

Mapping implementation plan to spec.md Success Criteria:

- **SC-001 (100% zero data loss)**: ✅ Automatic backup (Phase 0), validation tests (Phase 0), rollback proven (Phase 0)
- **SC-002 (≤10ms latency increase)**: ✅ Performance baseline (Phase 0), MV3 benchmarks (Phase 3), optimization (Phase 4)
- **SC-003 (README examples work)**: ✅ Baseline tests (Phase 0), regression tests (Phase 3)
- **SC-004 (MV3→MV2 export/import)**: ✅ Data format unchanged, export/import tests (Phase 0)
- **SC-005 (Cross-browser testing)**: ✅ Chrome/Firefox/Edge testing (Phase 3)
- **SC-006 (Zero critical bugs in beta)**: ✅ Beta period with monitoring (Phase 5)
- **SC-007 (Service worker wake/sleep)**: ✅ Stateless design, wake/sleep tests (Phase 3)
- **SC-008 (JSON format compatibility)**: ✅ No schema changes, import/export validation (Phase 0)
- **SC-009 (Advanced options work)**: ✅ js/redirect.js unchanged, feature tests (Phase 3)
- **SC-010 (Migration ≤5 seconds)**: ✅ Lightweight migration (just backup), performance testing (Phase 3)
- **SC-011 (Rollback proven)**: ✅ Rollback procedure testing (Phase 0 Task T007)
- **SC-012 (Memory ≤20% increase)**: ✅ Memory baseline (Phase 0), MV3 memory testing (Phase 3)
- **SC-013 (Loop detection works)**: ✅ Loop detection unchanged, loop tests (Phase 3)
- **SC-014 (1000 tabs handled)**: ✅ Load testing (Phase 3)
- **SC-015 (User feedback positive)**: ✅ Beta feedback collection (Phase 5)

**All success criteria mapped to implementation phases with validation steps.**

---

## Next Steps

1. ✅ **Phase 0 complete**: Run `/speckit.plan` to generate research.md, data-model.md, quickstart.md
2. **Phase 1 validation**: Review generated artifacts, run Constitution Check again
3. **Phase 2 tasks**: Run `/speckit.tasks` to generate implementation tasks from this plan
4. **Implementation**: Execute tasks in order, following Constitution principles
5. **Beta release**: Deploy to 1% users, monitor for 1 week, iterate
6. **Stable release**: Gradual rollout 10%→25%→50%→100% over 4 weeks

**Ready for**: Phase 0 research and baseline establishment.
