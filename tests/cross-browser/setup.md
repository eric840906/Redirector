# Cross-Browser Test Environment Setup

**Date**: 2025-12-22
**Purpose**: Test environment for MV2 baseline and MV3 validation
**Browsers**: Chrome, Firefox, Edge

---

## Browser Requirements

### Chrome (MV3 Testing)

**Versions Required**:
- Chrome 88+ (minimum MV3 support)
- Chrome 100+ (stable MV3)
- Chrome 120+ (current stable)

**Installation**:
```bash
# macOS
brew install --cask google-chrome

# Check version
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

**Developer Mode**:
1. Chrome → Extensions (`chrome://extensions/`)
2. Enable "Developer mode" (top right toggle)
3. "Load unpacked" → Select Redirector directory

**Profiles**:
- Create separate profile for testing: Chrome → Settings → Manage profiles → Add
- Isolates test data from personal browsing

---

### Firefox (MV2 Testing)

**Versions Required**:
- Firefox 109+ (last stable MV2 support)
- Firefox 115 ESR (long-term MV2 support)
- Firefox 120+ (current stable)

**Installation**:
```bash
# macOS
brew install --cask firefox

# Check version
/Applications/Firefox.app/Contents/MacOS/firefox --version
```

**Developer Mode**:
1. Firefox → Add-ons (`about:addons`)
2. Settings gear → "Debug Add-ons"
3. "Load Temporary Add-on" → Select `manifest.json`

**Profiles**:
```bash
# Create test profile
/Applications/Firefox.app/Contents/MacOS/firefox -CreateProfile "redirector-test"

# Launch with test profile
/Applications/Firefox.app/Contents/MacOS/firefox -P redirector-test
```

---

### Edge (MV3 Testing)

**Versions Required**:
- Edge 88+ (minimum MV3 support, Chromium-based)
- Edge 120+ (current stable)

**Installation**:
```bash
# macOS
brew install --cask microsoft-edge

# Check version
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --version
```

**Developer Mode**:
1. Edge → Extensions (`edge://extensions/`)
2. Enable "Developer mode"
3. "Load unpacked" → Select Redirector directory

**Notes**: Edge is Chromium-based, should behave identically to Chrome for MV3

---

## Test Matrix

| Browser | Version | Manifest | Purpose |
|---------|---------|----------|---------|
| Chrome 88 | 88+ | MV3 | Minimum version validation |
| Chrome 120 | 120+ | MV3 | Current stable validation |
| Firefox 109 | 109+ | MV2 | MV2 maintenance branch |
| Firefox 120 | 120+ | MV2 | Current stable MV2 |
| Edge 88 | 88+ | MV3 | Minimum version validation |
| Edge 120 | 120+ | MV3 | Current stable validation |

---

## Loading Extension

### Chrome/Edge (MV3)

**Manifest**: Use `manifest.json` (MV3 version after migration)

1. Navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/path/to/Redirector` directory
5. Verify extension loads without errors
6. Check popup shows correct version (4.0.0-beta.1)

**Verification**:
- Extension icon visible in toolbar
- Popup opens correctly
- Settings page accessible
- No console errors in background page

---

### Firefox (MV2)

**Manifest**: Use `manifest-firefox.json` OR original `manifest.json` (MV2 version)

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` (or `manifest-firefox.json`)
4. Verify extension loads
5. Check popup shows correct version (3.5.4 for MV2)

**Important**: Temporary add-ons removed on browser restart. For persistent testing:
- Create unsigned XPI: `web-ext build`
- Install via `about:config` → `xpinstall.signatures.required` = false
- Or submit to AMO for signing

---

## Test Data Management

### Shared Test Datasets

**Location**: `tests/baseline/datasets/`

- `baseline-empty.json` - 0 rules
- `baseline-10-rules.json` - 10 diverse rules
- `baseline-100-rules.json` - 100 rules (load test)

**Import Procedure**:
1. Open extension settings page
2. Click "Import"
3. Select dataset JSON file
4. Verify rules loaded correctly

---

### Browser-Specific Storage

**Chrome/Edge**:
- Storage located in profile directory
- Path: `~/Library/Application Support/Google/Chrome/Default/`
- Inspect: `chrome://extensions/` → Redirector → "Inspect views: background page" → Console → `chrome.storage.local.get(null, console.log)`

**Firefox**:
- Storage in profile directory
- Path: `~/Library/Application Support/Firefox/Profiles/[profile]/`
- Inspect: `about:debugging` → Redirector → "Inspect" → Console → `browser.storage.local.get(null, console.log)`

---

## Cross-Browser Test Scenarios

### Scenario 1: Export from Chrome, Import to Firefox

**Purpose**: Verify MV3 (Chrome) → MV2 (Firefox) data compatibility

**Steps**:
1. Load MV3 in Chrome with 10 rules
2. Export → Save as `chrome-mv3-export.json`
3. Load MV2 in Firefox
4. Import `chrome-mv3-export.json`
5. Verify all rules work identically

**Expected**: Zero data loss, identical redirect behavior

---

### Scenario 2: Export from Firefox, Import to Chrome

**Purpose**: Verify MV2 (Firefox) → MV3 (Chrome) data compatibility

**Steps**:
1. Load MV2 in Firefox with 10 rules
2. Export → Save as `firefox-mv2-export.json`
3. Load MV3 in Chrome
4. Import `firefox-mv2-export.json`
5. Verify all rules work identically

**Expected**: Zero data loss, identical redirect behavior

---

### Scenario 3: Parallel Browser Testing

**Purpose**: Verify identical redirect behavior across all browsers

**Test URL**: https://en.m.wikipedia.org/ (de-mobilizer)

**Steps**:
1. Import `baseline-10-rules.json` in all browsers
2. Navigate to test URL in each browser
3. Verify redirect to https://en.wikipedia.org/
4. Record redirect timing

**Expected Results**:
| Browser | Redirected URL | Latency |
|---------|----------------|---------|
| Chrome 120 MV3 | https://en.wikipedia.org/ | [X] ms |
| Firefox 120 MV2 | https://en.wikipedia.org/ | [X] ms |
| Edge 120 MV3 | https://en.wikipedia.org/ | [X] ms |

All should be IDENTICAL (except latency may vary slightly)

---

## Browser-Specific Quirks

### Firefox-Specific

**Request Type**: `imageset`
- Firefox supports `imageset` request type for images
- Chrome/Edge do NOT support this type
- **Handling**: Chrome should ignore gracefully (no errors)
- **Test**: Import rule with `imageset` in Chrome → Should not crash

### Chrome-Specific

**Theme Icons**:
- `theme_icons` in `browser_action` (MV2) or `action` (MV3)
- Firefox does NOT support `theme_icons`
- **Handling**: Firefox should ignore gracefully

### Edge-Specific

**Chromium-based**:
- Edge uses Chromium engine
- Should behave identically to Chrome for MV3
- **Test**: All Chrome tests should pass in Edge

---

## Automated Testing (Future)

**Puppeteer Setup** (for automated cross-browser testing):

```javascript
// Example: Automated redirect test
const puppeteer = require('puppeteer');

async function testRedirect(browser, testUrl, expectedUrl) {
  const page = await browser.newPage();
  await page.goto(testUrl);
  const finalUrl = page.url();
  console.assert(finalUrl === expectedUrl, `Expected ${expectedUrl}, got ${finalUrl}`);
}

// Run across Chrome, Firefox (via puppeteer-firefox)
```

**Future Enhancement**: Phase N-1 could automate these tests

---

## Test Results Template

**Date**: [YYYY-MM-DD]
**Tester**: [NAME]

| Browser | Version | Manifest | Load Success | Import Success | Redirect Test | Notes |
|---------|---------|----------|--------------|----------------|---------------|-------|
| Chrome 120 | 120.x | MV3 | [ ] PASS | [ ] PASS | [ ] PASS | |
| Firefox 120 | 120.x | MV2 | [ ] PASS | [ ] PASS | [ ] PASS | |
| Edge 120 | 120.x | MV3 | [ ] PASS | [ ] PASS | [ ] PASS | |

**Overall**: [ ] ALL BROWSERS PASS / [ ] FAILURES

---

## Next Steps

1. ✅ Document test environment setup
2. ⏳ Install all required browsers
3. ⏳ Create test profiles
4. ⏳ Load MV2 baseline in all browsers
5. ⏳ Run cross-browser test scenarios
6. ⏳ Document any browser-specific issues
7. ⏳ Repeat tests with MV3 after migration (Phase N-1)

**Status**: ⏳ ENVIRONMENT SETUP PENDING

Complete setup before Phase 0 baseline testing.
