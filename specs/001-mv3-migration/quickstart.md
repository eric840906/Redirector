# Quickstart: Redirector MV3 Migration Testing & Deployment

**Date**: 2025-12-22
**Branch**: 001-mv3-migration
**Status**: Guide

## Purpose

Provide step-by-step procedures for testing, validating, and deploying the Redirector MV3 migration while honoring Constitution principles and ensuring zero data loss.

## Prerequisites

- Chrome 88+ (for MV3 testing)
- Firefox 109+ (for MV2 verification)
- Edge 88+ (for MV3 testing)
- Git access to repository
- Chrome Web Store developer account
- Firefox Add-ons developer account

---

## Phase 0: Establish MV2 Baseline (MANDATORY)

**Purpose**: Create reference implementation for regression testing (Constitution Principle V)

### Step 1: Install Current MV2 Version

```bash
# Checkout stable MV2 release
git checkout tags/v3.5.4

# Load unpacked in Chrome (MV2 still supported in developer mode)
# Chrome → Extensions → Developer Mode → Load Unpacked → Select directory

# Verify version
# Open popup, check "Redirector v3.5.4"
```

### Step 2: Create Baseline Test Data

**Test Dataset 1: README Examples**
1. Open settings page
2. Add all redirect examples from README.md:
   - De-mobilizer: `^(https?://)([a-z0-9-]*\.)m\.(.*)`  → `$1$2$3`
   - AMP redirect: `^(?:https?://)www.(?:google|bing).com/amp/(?:s/)?(.*)`  → `https://$1`
   - Doubleclick escaper: `^(?:https?://)ad.doubleclick.net/.*\?(http?s://.*)`  → `$1`
   - YouTube Shorts: `^(?:https?://)(?:www.)?youtube.com/shorts/([a-zA-Z0-9_-]+)(.*)`  → `https://www.youtube.com/watch?v=$1$2`
3. Test each redirect manually
4. Export rules: "Export Redirects" → Save as `baseline-readme-examples.json`

**Test Dataset 2: Edge Cases**
1. Create empty rule set: Export as `baseline-empty.json`
2. Create 10 rules with various patterns: Export as `baseline-10-rules.json`
3. Create 100+ rules (duplicate patterns with variations): Export as `baseline-100-rules.json`

**Test Dataset 3: Advanced Options**
1. URL decode rule: Pattern `https://example.com/*`, redirect to `https://other.com/$1`, process matches: URL decode
2. Base64 rule: Pattern with base64 encoded data, process matches: Base64 decode
3. History state rule: YouTube Shorts redirect with request type "history"
4. Export as `baseline-advanced-options.json`

### Step 3: Measure Performance Baseline

**Script**: Create `test/measure-performance.js`
```javascript
// Measure redirect latency
const testUrls = [
  'https://en.m.wikipedia.org/wiki/Test', // De-mobilizer
  'https://www.google.com/amp/www.example.com/page', // AMP
  // Add more...
];

let totalTime = 0;
let count = 0;

for (const url of testUrls) {
  const start = performance.now();
  // Navigate to URL, measure redirect time
  const end = performance.now();
  totalTime += (end - start);
  count++;
}

console.log(`Avg redirect latency: ${totalTime / count}ms`);
console.log(`P95 latency: ${/* calculate p95 */}ms`);
```

**Record Baseline**:
- Empty rules: ~X ms
- 10 rules: ~X ms
- 100 rules: ~X ms
- Complex regex: ~X ms

Save results to `test/baseline-performance.txt`

### Step 4: Test Cross-Browser

1. Firefox: Install MV2 v3.5.4, import `baseline-readme-examples.json`, test all redirects
2. Edge: Same as Chrome
3. Record: "All redirects work identically across Chrome/Firefox/Edge"

---

## Phase 1: MV3 Development Testing

**Purpose**: Validate MV3 changes before deployment

### Step 1: Build MV3 Version

```bash
# Checkout MV3 branch
git checkout 001-mv3-migration

# Verify manifest changes
cat manifest.json | grep "manifest_version"
# Should show: "manifest_version": 3

# No build step needed (pure JS, no transpilation per Constitution)
```

### Step 2: Load MV3 in Chrome

```bash
# Chrome → Extensions → Developer Mode → Load Unpacked → Select directory
# Verify version shows "4.0.0" or "4.0.0-beta"
```

### Step 3: Test Migration from MV2

**Scenario 1: Automatic Upgrade**
1. Start with MV2 v3.5.4 loaded with 10 rules
2. Chrome → Extensions → Remove MV2
3. Chrome → Extensions → Load Unpacked → Load MV3
4. Open settings page → Verify all 10 rules present
5. Open console → Check for `mv2_backup_<timestamp>` and `migrationState` keys
6. Export rules → Save as `post-migration.json`
7. Compare: `diff baseline-10-rules.json post-migration.json`
   - Should be identical (except `createdBy` version field)

**Scenario 2: Empty State Fresh Install**
1. Chrome → Extensions → Load Unpacked → Load MV3
2. Open settings page → Verify empty rule list
3. Add new rule → Verify it saves and works
4. No migration-related keys should exist

**Scenario 3: Large Rule Set (100+)**
1. Start with MV2 v3.5.4 loaded with 100+ rules
2. Upgrade to MV3
3. Verify all 100+ rules present
4. Test performance: Should be within 10ms of MV2 baseline (SC-002)

### Step 4: Test MV3 Features

**Redirects Work Identically**:
```bash
# For each baseline test dataset:
1. Import into MV3
2. Navigate to test URLs
3. Verify redirect behavior matches MV2 exactly
4. Record any differences
```

**Pattern Matching Preserved**:
- Regex with capture groups: `$1`, `$2`, etc. → Test de-mobilizer
- Wildcard patterns: `*` expansion → Test all wildcard rules
- URL processing: decode, encode, base64 → Test advanced options
- Exclude patterns: Test rules with exclude → Should not redirect if excluded

**Service Worker Wake/Sleep**:
1. Load MV3 with rules
2. Trigger redirect → Record time
3. Wait 35 seconds (service worker should sleep)
4. Trigger same redirect → Record time (cold start)
5. Expected: Cold start ~50-100ms, warm ~5-10ms

**Storage Sync Toggle**:
1. Enable sync in settings page
2. Verify redirects moved to chrome.storage.sync
3. Disable sync
4. Verify redirects moved back to chrome.storage.local
5. No data loss

### Step 5: Test Rollback

**MV3 → MV2 Rollback**:
1. MV3 loaded with 50 rules
2. Export rules → Save as `mv3-export.json`
3. Chrome → Extensions → Remove MV3
4. Chrome → Extensions → Load Unpacked → Load MV2 v3.5.4
5. Import `mv3-export.json`
6. Verify all 50 rules work in MV2
7. **Success Criteria**: Zero data loss, identical behavior (SC-004, SC-011)

---

## Phase 2: Cross-Browser Testing

### Chrome Testing

**Versions**: 88, 100, 120 (current)

**Procedure**:
1. Load MV3 on each Chrome version
2. Import `baseline-readme-examples.json`
3. Test all redirects
4. Verify UI works (popup, settings)
5. Verify export/import
6. **Pass Criteria**: All features work, no errors

### Edge Testing

**Versions**: 88, 100, 120 (current)

**Procedure**: Same as Chrome (Edge is Chromium-based)

### Firefox Testing

**Versions**: 109, 115, 120 (current) - **MV2 only**

**Procedure**:
1. Load MV2 v3.5.4 (maintain separate MV2 branch)
2. Test all redirects work
3. Test export from Chrome MV3 → Import into Firefox MV2
4. **Pass Criteria**: MV2 continues working in Firefox, cross-browser data export/import works

---

## Phase 3: Performance Validation

### Latency Testing

**Baseline** (MV2 v3.5.4):
- 10 rules: X ms (p50), Y ms (p95)
- 100 rules: X ms (p50), Y ms (p95)

**MV3 Target** (per SC-002):
- 10 rules: ≤X+10 ms (p50), ≤Y+10 ms (p95)
- 100 rules: ≤X+10 ms (p50), ≤Y+10 ms (p95)

**Test Procedure**:
```javascript
// Run in console
const start = performance.now();
// Trigger redirect
const end = performance.now();
console.log(`Redirect latency: ${end - start}ms`);

// Repeat 100 times, calculate p50, p95, p99
```

### Memory Testing

**Baseline** (MV2 v3.5.4):
- Memory usage with 100 rules: X MB

**MV3 Target** (per SC-012):
- Memory usage: ≤X * 1.2 MB (20% increase max)

**Test Procedure**:
1. Chrome → Task Manager → Find Redirector extension
2. Record memory usage with 0, 10, 100 rules
3. Compare to MV2 baseline

### Load Testing

**1000 Tabs Test** (SC-014):
1. Open 1000 tabs (script: `for (let i=0; i<1000; i++) window.open('about:blank')`)
2. Load rule that redirects `about:blank` → `https://example.com`
3. Trigger redirect
4. **Pass Criteria**: No freeze, no crash, redirect completes

---

## Phase 4: Rollback Procedure Testing

### Test Rollback from Automatic Backup

**Scenario**: User upgrades MV2 → MV3, encounters issue, wants to revert

**Procedure**:
1. MV2 v3.5.4 with 50 rules
2. Upgrade to MV3 v4.0.0
3. Verify `mv2_backup_<timestamp>` key exists in chrome.storage.local
4. Manually trigger rollback:
   ```javascript
   // In console
   chrome.storage.local.get(null, (data) => {
     const backupKey = Object.keys(data).find(k => k.startsWith('mv2_backup_'));
     const backup = data[backupKey];
     chrome.storage.local.set({
       redirects: backup.redirects,
       disabled: backup.disabled,
       logging: backup.logging,
       enableNotifications: backup.enableNotifications,
       isSyncEnabled: backup.isSyncEnabled
     }, () => {
       chrome.storage.local.remove(['migrationState'], () => {
         console.log('Rollback complete. Reload extension.');
       });
     });
   });
   ```
5. Reload extension
6. Verify all 50 rules restored
7. **Timing**: Should take < 5 minutes (SC-011, Constitution Principle VI)

---

## Phase 5: Beta Release

### Chrome Web Store Beta

1. **Create Beta Build**:
   ```bash
   # Tag beta release
   git tag v4.0.0-beta.1

   # Zip extension files
   zip -r redirector-4.0.0-beta.1.zip manifest.json js/ css/ images/ popup.html redirector.html privacy.md -x "*.DS_Store"
   ```

2. **Upload to Chrome Web Store**:
   - Dashboard → Redirector → Store Listing
   - Distribution → Visibility → Private → Test group
   - Create test group: "MV3 Beta Testers" (email list)
   - Upload ZIP
   - Submit for review

3. **Monitor Beta** (2 weeks minimum):
   - GitHub Issues: Tag with "mv3-beta"
   - Chrome Web Store Reviews: Monitor for complaints
   - Analytics: Track error rates, crash reports
   - **Pass Criteria**: Zero critical bugs (SC-006)

---

## Phase 6: Stable Release

### Pre-Release Checklist

- [ ] All Phase 0-5 tests pass
- [ ] Beta feedback reviewed and addressed
- [ ] Cross-browser testing complete
- [ ] Performance within targets (SC-002, SC-012)
- [ ] Rollback procedure tested and documented
- [ ] Release notes written
- [ ] Constitution Check re-verified

### Chrome Web Store Stable Release

1. **Gradual Rollout**:
   - Day 1: 1% of users
   - Day 3: 10% of users
   - Day 7: 25% of users
   - Day 14: 50% of users
   - Day 21: 100% of users

2. **Monitor Rollout**:
   - Error rate < 5% (trigger for rollback)
   - Critical bugs: Immediate rollback
   - User feedback: Address high-priority issues

3. **Rollback Trigger**:
   - >5% error rate
   - Any data loss reports
   - >10 critical bugs
   - Performance >20% worse than MV2

### Firefox Add-ons (MV2 Maintenance)

1. **Keep MV2 Branch Active**:
   ```bash
   git checkout -b mv2-maintenance
   # Tag: v3.5.5, v3.5.6, etc.
   ```

2. **Firefox Release**:
   - Continue publishing MV2 updates as needed
   - Monitor Firefox MV3 roadmap
   - Plan Firefox MV3 migration when ready

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass (Phase 0-5)
- [ ] Beta period complete (2 weeks, 100+ users, zero critical bugs)
- [ ] Performance validated (≤10ms slower, ≤20% memory increase)
- [ ] Rollback procedure tested and documented
- [ ] Release notes written (explain MV3 migration, rollback procedure)
- [ ] Emergency rollback plan prepared (pre-written announcement)

### Deployment Day

- [ ] Tag release: `git tag v4.0.0`
- [ ] Build ZIP: `zip -r redirector-4.0.0.zip ...`
- [ ] Upload to Chrome Web Store
- [ ] Submit for review
- [ ] Monitor initial rollout (1% users, 24 hours)

### Post-Deployment

- [ ] Monitor GitHub Issues (tag "mv3")
- [ ] Monitor Chrome Web Store reviews
- [ ] Monitor error rates in analytics
- [ ] Respond to user feedback within 24 hours
- [ ] Prepare hotfix if needed (v4.0.1)

---

## Rollback Procedure (Emergency)

**Trigger Conditions**:
- Critical data loss reports
- Error rate >5%
- Performance degradation >20%
- >10 critical bugs in 48 hours

**Procedure** (Complete in < 5 minutes):
1. Chrome Web Store → Redirector → Deactivate v4.0.0
2. Chrome Web Store → Redirector → Publish v3.5.4
3. GitHub → Create issue: "MV3 Rollback - [reason]"
4. Post announcement: Reddit, Twitter, website
5. User instructions: Export from MV3 → Install MV2 → Import

**Rollback Announcement Template**:
```
# Redirector MV3 Temporarily Rolled Back

We've temporarily rolled back Redirector to v3.5.4 (MV2) due to [specific issue].

**What happened**: [Brief explanation]

**What you need to do**:
1. Export your redirects from the current version
2. Install Redirector v3.5.4 from the Chrome Web Store
3. Import your redirects

**Your data is safe**: Automatic backups were created during migration.

**Timeline**: We're investigating and will re-release MV3 after fixing [issue].

Thank you for your patience. Your redirect rules are safe.
```

---

## Success Criteria Validation

Map testing to spec.md Success Criteria:

- **SC-001**: 100% data preservation → Test: Migration + Rollback
- **SC-002**: ≤10ms latency increase → Test: Performance benchmarks
- **SC-003**: README examples work → Test: Baseline tests
- **SC-004**: MV3→MV2 export/import → Test: Rollback procedure
- **SC-005**: Cross-browser testing → Test: Chrome/Firefox/Edge
- **SC-006**: Zero critical bugs in beta → Test: Beta period monitoring
- **SC-007**: Service worker wake/sleep → Test: Cold start testing
- **SC-008**: JSON format compatibility → Test: Export/import
- **SC-009**: Advanced options work → Test: Feature tests
- **SC-010**: Migration ≤5 seconds → Test: Migration timing
- **SC-011**: Rollback proven → Test: Rollback procedure
- **SC-012**: Memory ≤20% increase → Test: Memory benchmarks
- **SC-013**: Loop detection works → Test: Edge cases
- **SC-014**: 1000 tabs handled → Test: Load testing
- **SC-015**: User feedback positive → Test: Beta feedback

---

## Summary

**Testing Phases**:
1. Phase 0: MV2 Baseline (MANDATORY before any changes)
2. Phase 1: MV3 Development Testing (functionality, migration, rollback)
3. Phase 2: Cross-Browser Testing (Chrome, Firefox, Edge)
4. Phase 3: Performance Validation (latency, memory, load)
5. Phase 4: Rollback Testing (automatic backup, manual rollback)
6. Phase 5: Beta Release (2 weeks, 100+ users, monitoring)
7. Phase 6: Stable Release (gradual rollout, 1%→100%)

**Constitution Compliance**:
- ✅ Principle V (Test Obsessively): Comprehensive testing plan
- ✅ Principle VI (Explicit Risk Assessment): Rollback procedures tested
- ✅ Principle VII (Backward Compatibility): MV2 maintenance, rollback proven

**Ready for**: `/speckit.tasks` to generate implementation task list from this plan.
