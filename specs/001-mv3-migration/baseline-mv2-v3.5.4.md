# MV2 Baseline: Redirector v3.5.4

**Date**: 2025-12-22
**Purpose**: Document current MV2 version as rollback baseline
**Branch**: master (before MV3 migration)
**Status**: Official MV2 Rollback Baseline

## Version Information

- **Version**: 3.5.4
- **Manifest Version**: 2
- **Release Date**: 2019 (last maintained by Einar Egilsson)
- **Git Tag**: v3.5.4
- **Commit**: (to be tagged in Phase 1)

## Key Characteristics

### Manifest V2 APIs Used

- **webRequest**: `webRequest` + `webRequestBlocking` permissions
- **Background**: Persistent background page with `js/redirect.js` and `js/background.js`
- **Browser Action**: `browser_action` API with theme icons
- **Permissions**: Direct permission list (no host_permissions separation)

### File Structure

```
manifest.json         - MV2 manifest (manifest_version: 2)
js/
├── background.js     - Persistent background page, webRequest listener
├── redirect.js       - Pattern matching engine (305 lines, unchanged in MV3)
├── popup.js          - Quick access panel
├── importexport.js   - Export/import functionality
├── editredirect.js   - Rule editing UI
├── redirectorpage.js - Main settings page
├── organizemode.js   - Rule organization
├── util.js           - Utilities
└── stub.js           - Browser polyfills
popup.html            - Popup UI
redirector.html       - Settings page UI
css/                  - Styles
images/               - Icons
```

### Core Functionality (Baseline)

1. **Redirect Types**:
   - Regex patterns with capture groups ($1, $2, ...)
   - Wildcard patterns with asterisk (*)
   - Include and exclude patterns

2. **Advanced Options**:
   - URL decode processing
   - URL encode processing
   - Double URL decode
   - Base64 decode
   - Request type filtering (main_frame, sub_frame, history, etc.)

3. **Performance Characteristics** (to be measured in T003):
   - Redirect latency: [BASELINE TO BE MEASURED]
   - Memory usage: [BASELINE TO BE MEASURED]
   - Rule evaluation: [BASELINE TO BE MEASURED]

4. **Storage**:
   - chrome.storage.local for redirects array
   - chrome.storage.sync optional
   - Keys: redirects, disabled, logging, enableNotifications, isSyncEnabled

5. **Loop Detection**:
   - Threshold: 3 redirects within 3 seconds
   - Prevents infinite redirect chains

### Known Issues and Quirks

- Firefox-specific: `imageset` request type (issue #115)
- Chrome-specific: Theme icons for dark/light mode
- Storage sync: Quota limits (100KB total, 8KB per item)
- Persistent background page: Always running (memory resident)

### Rollback Instructions

If MV3 migration fails, users can revert to this baseline:

1. **Export redirects** from MV3 version (Settings → Export)
2. **Uninstall** Redirector MV3
3. **Install** Redirector v3.5.4 from:
   - Chrome Web Store (rollback version)
   - Firefox Add-ons (MV2 maintained)
   - GitHub release: `git checkout v3.5.4`
4. **Import redirects** (Settings → Import)
5. **Verify** all rules work identically

### Testing Baseline (to be established)

**README Examples** (to be tested in T001):
- De-mobilizer: `^(https?://)([a-z0-9-]*\.)m\.(.*)`  → `$1$2$3`
- AMP redirect: `^(?:https?://)www.(?:google|bing).com/amp/(?:s/)?(.*)`  → `https://$1`
- Doubleclick escaper: `^(?:https?://)ad.doubleclick.net/.*\\?(http?s://.*)`  → `$1`
- YouTube Shorts: `^(?:https?://)(?:www.)?youtube.com/shorts/([a-zA-Z0-9_-]+)(.*)`  → `https://www.youtube.com/watch?v=$1$2`

**Test Datasets** (to be created in T002):
- baseline-empty.json (0 rules)
- baseline-10-rules.json (10 typical rules)
- baseline-100-rules.json (100+ rules for load testing)

**Performance Metrics** (to be measured in T003):
- Redirect latency p50/p95/p99
- Memory usage with 0, 10, 100 rules
- Service worker wake time (N/A for MV2 - persistent background)

### Success Criteria for MV3

MV3 migration succeeds if:

1. ✅ **Zero data loss**: All redirect rules preserved
2. ✅ **Performance**: ≤10ms slower than this baseline
3. ✅ **Functionality**: All README examples work identically
4. ✅ **Compatibility**: Export from MV3 → Import into this MV2 works
5. ✅ **Rollback**: Users can revert to this baseline within 5 minutes

---

## Constitution Compliance

This baseline honors **Constitution Principle V (Test Obsessively)**:

> "Before touching 6-year-old production code with real users, we establish what 'working' looks like. This baseline is our ground truth for regression detection."

**Einar Egilsson's legacy**: This v3.5.4 baseline represents Einar's last stable release. Our MV3 migration will preserve his design decisions and user trust.

---

## Next Steps

1. ✅ T000 - This baseline document created
2. ⏳ T001 - Create baseline test suite (README examples)
3. ⏳ T002 - Collect test datasets (0, 10, 100+ rules)
4. ⏳ T003 - Measure performance baseline
5. ⏳ T004-T007 - Additional baseline tasks

**Status**: Baseline documentation complete. Ready for testing phase.
