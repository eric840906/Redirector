# Build Instructions

Redirector supports multiple browsers with different manifest versions:
- **Chrome/Edge/Opera/Vivaldi**: Manifest V3 (manifest.json)
- **Firefox**: Manifest V2 (manifest-firefox.json)

## Prerequisites

- Git
- Zip utility (for creating release archives)
- Target browsers for testing:
  - Chrome 88+ or Edge 88+ (for MV3 testing)
  - Firefox 109+ (for MV2 testing)

## Branch Structure

- **Main branch** (`001-mv3-migration`): Manifest V3 for Chrome/Edge
- **MV2 maintenance branch** (`mv2-maintenance`): Manifest V2 for Firefox

## Building for Chrome/Edge (Manifest V3)

### Development Build

1. Clone the repository and checkout the MV3 branch:
   ```bash
   git checkout 001-mv3-migration
   ```

2. Load unpacked extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the Redirector directory

The extension uses:
- `manifest.json` (Manifest V3)
- `js/background.js` (service worker)
- `js/declarative-rules.js` (declarativeNetRequest API)
- `js/migration.js` (MV2→MV3 migration utility)

### Release Build

1. Ensure all changes are committed:
   ```bash
   git status
   ```

2. Update version in `manifest.json`:
   ```json
   "version": "4.0.0"
   ```

3. Create release tag:
   ```bash
   git tag v4.0.0
   git push origin v4.0.0
   ```

4. Create release ZIP:
   ```bash
   zip -r redirector-4.0.0-chrome.zip \
     manifest.json \
     js/ \
     css/ \
     images/ \
     popup.html \
     redirector.html \
     privacy.md \
     -x "*.DS_Store" \
     -x "js/background-mv2.js"
   ```

5. Upload to Chrome Web Store:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Select Redirector
   - Upload new ZIP
   - Submit for review

## Building for Firefox (Manifest V2)

### Development Build

1. Checkout the MV2 maintenance branch:
   ```bash
   git checkout mv2-maintenance
   ```

2. Copy Firefox manifest:
   ```bash
   cp manifest-firefox.json manifest.json
   ```

3. Update background.js to MV2 version (if needed):
   ```bash
   # MV2 branch should already have correct background.js
   # No service worker imports, uses persistent background page
   ```

4. Load temporary add-on in Firefox:
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json` in the Redirector directory

The extension uses:
- `manifest-firefox.json` → copied to `manifest.json` (Manifest V2)
- `js/background.js` (persistent background page, MV2 version)
- `js/redirect.js` (shared pattern matching logic)

### Release Build

1. Ensure on MV2 branch and changes committed:
   ```bash
   git checkout mv2-maintenance
   git status
   ```

2. Copy Firefox manifest:
   ```bash
   cp manifest-firefox.json manifest.json
   ```

3. Update version in `manifest.json`:
   ```json
   "version": "3.5.5"
   ```

4. Create release tag:
   ```bash
   git tag v3.5.5-firefox
   git push origin v3.5.5-firefox
   ```

5. Create release ZIP:
   ```bash
   zip -r redirector-3.5.5-firefox.zip \
     manifest.json \
     js/ \
     css/ \
     images/ \
     popup.html \
     redirector.html \
     privacy.md \
     -x "*.DS_Store" \
     -x "js/migration.js" \
     -x "js/declarative-rules.js"
   ```

6. Upload to Firefox Add-ons:
   - Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - Select Redirector
   - Upload new ZIP
   - Submit for review

## Code Differences Between MV2 and MV3

### Files That Differ

| File | MV2 (Firefox) | MV3 (Chrome/Edge) |
|------|---------------|-------------------|
| `manifest.json` | manifest_version: 2, background.scripts, browser_action, webRequestBlocking | manifest_version: 3, background.service_worker, action, declarativeNetRequest |
| `js/background.js` | Persistent background page, blocking webRequest, chrome.browserAction | Service worker, non-blocking webRequest + declarativeNetRequest, chrome.action |

### Files That Are Identical

All other files are 100% identical between MV2 and MV3:
- `js/redirect.js` - Pattern matching core (305 lines, unchanged)
- `js/popup.js` - Popup UI logic
- `js/importexport.js` - Import/export functionality
- `js/redirectorpage.js` - Settings page logic
- `js/editredirect.js` - Edit form logic
- `js/organizemode.js` - UI helpers
- `js/util.js` - Utility functions
- All HTML, CSS, and image files

### MV3-Only Files

These files only exist in the MV3 build:
- `js/migration.js` - MV2→MV3 data migration utility
- `js/declarative-rules.js` - declarativeNetRequest dynamic rule generator

## Testing

### Chrome/Edge MV3 Testing

1. Load unpacked extension in Chrome 88+
2. Import test dataset: `tests/baseline/datasets/baseline-10-rules.json`
3. Run manual tests:
   ```bash
   # Test redirects work
   # Test migration (upgrade from MV2 v3.5.4)
   # Test performance (cold start, warm redirects)
   # Test all features (import/export, notifications, logging)
   ```

4. Run automated tests (if available):
   ```bash
   npm test
   ```

### Firefox MV2 Testing

1. Load temporary add-on in Firefox 109+
2. Import test dataset: `tests/baseline/datasets/baseline-10-rules.json`
3. Run manual tests:
   ```bash
   # Test redirects work
   # Test cross-browser compatibility (export from Chrome MV3, import into Firefox MV2)
   # Test all features
   ```

### Cross-Browser Testing

1. **Export from Chrome MV3**:
   - Add 10 redirect rules in Chrome MV3
   - Export to `test-export-mv3.json`

2. **Import into Firefox MV2**:
   - Load Firefox MV2
   - Import `test-export-mv3.json`
   - Verify all 10 rules work identically

3. **Export from Firefox MV2**:
   - Export from Firefox to `test-export-mv2.json`

4. **Import into Chrome MV3**:
   - Load Chrome MV3
   - Import `test-export-mv2.json`
   - Verify all rules work identically

## Version Numbering

- **Chrome/Edge MV3**: v4.0.0, v4.0.1, v4.1.0, etc.
- **Firefox MV2**: v3.5.4, v3.5.5, v3.5.6, etc. (maintenance releases)

Major version 4.x is reserved for MV3. Major version 3.x is reserved for MV2.

## Deployment Strategy

### Beta Release

1. Create beta build with version `4.0.0-beta.1`
2. Upload to Chrome Web Store as beta channel
3. Monitor for 2 weeks with 100+ beta users
4. Fix critical bugs, release `4.0.0-beta.2` if needed
5. Ensure zero critical bugs before stable release

### Stable Release (Gradual Rollout)

1. Tag stable release: `v4.0.0`
2. Upload to Chrome Web Store
3. Gradual rollout schedule:
   - Day 1: 1% of users
   - Day 3: 10% of users
   - Day 7: 25% of users
   - Day 14: 50% of users
   - Day 21: 100% of users

4. Monitor error rates and user feedback
5. Rollback trigger: >5% error rate or critical data loss

### Firefox Maintenance Releases

1. MV2 continues on `mv2-maintenance` branch
2. Security fixes and critical bugs only
3. No new features (MV2 is frozen)
4. Version: 3.5.x incremental

## Continuous Integration (Future)

Currently, builds are manual. Future improvements:

- GitHub Actions for automated testing
- Automated ZIP creation on git tag
- Cross-browser testing in CI
- Performance regression testing

## Troubleshooting

### Chrome Errors

**Error**: "Service worker registration failed"
- **Solution**: Ensure `background.service_worker` points to `js/background.js`
- **Solution**: Check for syntax errors in background.js

**Error**: "Permissions warnings" during installation
- **Solution**: Verify `declarativeNetRequest` and `declarativeNetRequestWithHostAccess` permissions in manifest.json
- **Solution**: Ensure `host_permissions` includes `http://*/*` and `https://*/*`

### Firefox Errors

**Error**: "background.scripts is not valid"
- **Solution**: Ensure using `manifest-firefox.json` (Manifest V2 format)
- **Solution**: Verify `background.scripts` array contains `["js/redirect.js", "js/background.js"]`

**Error**: "browser_action is not valid"
- **Solution**: Firefox MV2 uses `browser_action`, not `action`
- **Solution**: Check manifest-firefox.json format

## Reference

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox Extension Manifest V2](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
