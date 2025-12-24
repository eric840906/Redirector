# Storage Contract: chrome.storage Schema

**Date**: 2025-12-22
**Branch**: 001-mv3-migration
**Status**: Stable

## Purpose

Define the chrome.storage schema contract between background worker and UI pages. This contract is **identical** between MV2 and MV3 to ensure compatibility and rollback capability.

## Storage Areas

### chrome.storage.local

Primary storage for all redirect data and settings. Unlimited quota (typically 10MB+).

**Contract**: All extension components access this storage area for redirects and settings.

### chrome.storage.sync

Optional storage for syncing redirects across devices. 100KB total, 8KB per item limit.

**Contract**: Only used when user enables sync. Fallback to local if quota exceeded.

---

## Storage Keys

### Key: `redirects`

**Type**: `Array<RedirectRule>`

**Storage**: local or sync (based on `isSyncEnabled`)

**Description**: Array of all user-defined redirect rules

**Contract**:
- **Reader**: Background worker (on wake), settings page (on load)
- **Writer**: Settings page (on save), import (on import)
- **Modification**: Only via UI or import, never automatic
- **Size**: Unbounded (users can have 100+ rules)

**Example**:
```json
[
  {
    "description": "De-mobilizer",
    "exampleUrl": "https://en.m.wikipedia.org/",
    "includePattern": "^(https?://)([a-z0-9-]*\\.)m\\.(.*)$",
    "excludePattern": "",
    "redirectUrl": "$1$2$3",
    "patternType": "R",
    "processMatches": "noProcessing",
    "disabled": false,
    "grouped": false,
    "appliesTo": ["main_frame", "sub_frame"]
  }
]
```

**Read Contract**:
```javascript
// Background worker (MV3 service worker)
async function ensureRedirectsLoaded() {
  const {redirects = []} = await chrome.storage.local.get({redirects: []});
  // Process redirects...
}

// Settings page
chrome.storage.local.get({redirects: []}, (obj) => {
  REDIRECTS = obj.redirects;
  renderRedirects();
});
```

**Write Contract**:
```javascript
// Settings page save
chrome.runtime.sendMessage({
  type: 'save-redirects',
  redirects: REDIRECTS
}, (response) => {
  showMessage(response.message);
});

// Background worker handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'save-redirects') {
    storageArea.set({redirects: request.redirects}, () => {
      sendResponse({message: "Redirects saved"});
    });
    return true; // Async response
  }
});
```

---

### Key: `disabled`

**Type**: `boolean`

**Storage**: local

**Default**: `false`

**Description**: Global extension enable/disable flag

**Contract**:
- **Reader**: Background worker (on startup), popup (on open)
- **Writer**: Popup (on toggle)
- **Effect**: When `true`, background worker removes webRequest listeners

**Example**:
```json
false
```

**Read Contract**:
```javascript
// Background worker
chrome.storage.local.get({disabled: false}, (obj) => {
  if (!obj.disabled) {
    setUpRedirectListener();
  } else {
    log('Redirector is disabled');
  }
});

// Popup
chrome.storage.local.get({disabled: false}, (obj) => {
  updateUI(obj.disabled);
});
```

**Write Contract**:
```javascript
// Popup toggle
chrome.storage.local.set({disabled: !currentState}, () => {
  // Storage change listener will trigger in background
});
```

**Change Event Contract**:
```javascript
// Background worker listens for changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.disabled) {
    if (changes.disabled.newValue == true) {
      chrome.webRequest.onBeforeRequest.removeListener(checkRedirects);
    } else {
      setUpRedirectListener();
    }
    updateIcon();
  }
});
```

---

### Key: `logging`

**Type**: `boolean`

**Storage**: local

**Default**: `false`

**Description**: Console logging enable flag (for debugging)

**Contract**:
- **Reader**: Background worker (on startup), popup (on open)
- **Writer**: Popup (on toggle)
- **Effect**: When `true`, background worker logs redirect decisions to console

**Example**:
```json
false
```

**Read/Write Contract**: Same pattern as `disabled`

**Usage Contract**:
```javascript
// Background worker
function log(msg, force) {
  if (log.enabled || force) {
    console.log('REDIRECTOR: ' + msg);
  }
}

chrome.storage.local.get({logging: false}, (obj) => {
  log.enabled = obj.logging;
});
```

---

### Key: `enableNotifications`

**Type**: `boolean`

**Storage**: local

**Default**: `false`

**Description**: Desktop notifications enable flag

**Contract**:
- **Reader**: Background worker (on startup), popup (on open)
- **Writer**: Popup (on toggle)
- **Effect**: When `true`, background worker shows notifications on redirect
- **Reset**: Set to `false` on browser startup (transient setting)

**Example**:
```json
false
```

**Read/Write Contract**: Same pattern as `disabled`

**Usage Contract**:
```javascript
// Background worker
if (enableNotifications) {
  sendNotifications(redirect, originalUrl, redirectedUrl);
}
```

---

### Key: `isSyncEnabled`

**Type**: `boolean`

**Storage**: local (always local, never synced)

**Default**: `false`

**Description**: Storage mode preference (local vs sync)

**Contract**:
- **Reader**: Background worker (on startup), settings page (on load)
- **Writer**: Settings page (on toggle sync)
- **Effect**: Determines which storage area (`local` vs `sync`) to use for `redirects`

**Example**:
```json
false
```

**Read Contract**:
```javascript
// Background worker
chrome.storage.local.get({isSyncEnabled: false}, (obj) => {
  storageArea = obj.isSyncEnabled ? chrome.storage.sync : chrome.storage.local;
});
```

**Write Contract** (complex - includes data migration):
```javascript
// Settings page toggle sync
chrome.runtime.sendMessage({
  type: 'toggle-sync',
  isSyncEnabled: true
}, (response) => {
  if (response.message === 'sync-enabled') {
    // Success
  } else if (response.message.indexOf('size') > -1) {
    // Quota error
  }
});

// Background worker handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'toggle-sync') {
    chrome.storage.local.set({isSyncEnabled: request.isSyncEnabled}, () => {
      if (request.isSyncEnabled) {
        // Check quota
        chrome.storage.local.getBytesInUse("redirects", (size) => {
          if (size > storageArea.QUOTA_BYTES_PER_ITEM) {
            // Too large for sync
            storageArea = chrome.storage.local;
            sendResponse({message: "Sync Not Possible - size too large"});
          } else {
            // Move data: local → sync
            chrome.storage.local.get({redirects: []}, (obj) => {
              chrome.storage.sync.set(obj, () => {
                chrome.storage.local.remove("redirects");
                storageArea = chrome.storage.sync;
                sendResponse({message: "sync-enabled"});
              });
            });
          }
        });
      } else {
        // Move data: sync → local
        chrome.storage.sync.get({redirects: []}, (obj) => {
          chrome.storage.local.set(obj, () => {
            chrome.storage.sync.remove("redirects");
            storageArea = chrome.storage.local;
            sendResponse({message: "sync-disabled"});
          });
        });
      }
    });
    return true; // Async response
  }
});
```

---

### Key: `migrationState` (MV3 Only)

**Type**: `MigrationState`

**Storage**: local

**Default**: N/A (only exists if migration performed)

**Description**: Tracks MV2 → MV3 migration status

**Contract**:
- **Reader**: Background worker (on install/update)
- **Writer**: Background worker (during migration)
- **Effect**: Prevents re-running migration, enables rollback diagnostics

**Example**:
```json
{
  "version": "4.0.0",
  "migratedFrom": "3.5.4",
  "timestamp": 1735171200000,
  "redirectsCount": 47,
  "backupKey": "mv2_backup_1735171200000",
  "status": "complete",
  "errors": []
}
```

**Write Contract**:
```javascript
// Background worker on update
chrome.runtime.onInstalled.addListener(async ({reason, previousVersion}) => {
  if (reason === 'update' && !await checkMigrationDone()) {
    const timestamp = Date.now();
    const backupKey = `mv2_backup_${timestamp}`;

    // Create backup
    const data = await chrome.storage.local.get(['redirects', 'disabled', 'logging', 'enableNotifications', 'isSyncEnabled']);
    await chrome.storage.local.set({
      [backupKey]: {
        ...data,
        metadata: {
          version: previousVersion,
          timestamp,
          browser: navigator.userAgent
        }
      }
    });

    // Create migration state
    await chrome.storage.local.set({
      migrationState: {
        version: chrome.runtime.getManifest().version,
        migratedFrom: previousVersion,
        timestamp,
        redirectsCount: data.redirects.length,
        backupKey,
        status: 'complete',
        errors: []
      }
    });
  }
});

async function checkMigrationDone() {
  const {migrationState} = await chrome.storage.local.get('migrationState');
  return !!migrationState;
}
```

---

### Key: `mv2_backup_<timestamp>` (MV3 Only)

**Type**: `Backup`

**Storage**: local

**Default**: N/A (created during migration)

**Description**: Automatic backup of MV2 data before migration

**Contract**:
- **Reader**: User (for manual rollback), support (for debugging)
- **Writer**: Background worker (during migration)
- **Effect**: Enables full rollback to MV2 state

**Example**:
```json
{
  "redirects": [...],
  "disabled": false,
  "logging": false,
  "enableNotifications": false,
  "isSyncEnabled": false,
  "metadata": {
    "version": "3.5.4",
    "timestamp": 1735171200000,
    "browser": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
  }
}
```

**Write Contract**: See `migrationState` above

**Rollback Contract**:
```javascript
async function rollbackFromBackup(backupKey) {
  const backup = await chrome.storage.local.get(backupKey);
  const data = backup[backupKey];

  await chrome.storage.local.set({
    redirects: data.redirects,
    disabled: data.disabled,
    logging: data.logging,
    enableNotifications: data.enableNotifications,
    isSyncEnabled: data.isSyncEnabled
  });

  await chrome.storage.local.remove(['migrationState']);
  console.log('Rollback complete. Please reload extension.');
}
```

---

## Message Passing Contract

### Background Worker → UI Messages

**Purpose**: No direct messages sent from background to UI. All communication via storage changes.

**Pattern**: UI pages listen to `chrome.storage.onChanged` for reactive updates.

---

### UI → Background Worker Messages

All UI → background communication uses `chrome.runtime.sendMessage`.

#### Message: `get-redirects`

**Sender**: Settings page (Firefox workaround)

**Payload**:
```javascript
{
  type: 'get-redirects'
}
```

**Response**:
```javascript
{
  redirects: [...]
}
```

**Handler Contract**:
```javascript
if (request.type == 'get-redirects') {
  storageArea.get({redirects: []}, (obj) => {
    sendResponse(obj);
  });
  return true; // Async
}
```

**Note**: Only needed in Firefox due to storage access restrictions. Chrome/Edge can read directly.

---

#### Message: `save-redirects`

**Sender**: Settings page

**Payload**:
```javascript
{
  type: 'save-redirects',
  redirects: [...]
}
```

**Response**:
```javascript
{
  message: "Redirects saved"
}
// OR (on error):
{
  message: "Redirects failed to save as size of redirects larger than allowed limit"
}
```

**Handler Contract**:
```javascript
if (request.type === 'save-redirects') {
  delete request.type;
  storageArea.set(request, () => {
    if (chrome.runtime.lastError) {
      if (chrome.runtime.lastError.message.indexOf("QUOTA_BYTES_PER_ITEM quota exceeded") > -1) {
        sendResponse({message: "Redirects failed to save as size of redirects larger than what's allowed by Sync"});
      }
    } else {
      sendResponse({message: "Redirects saved"});
    }
  });
  return true; // Async
}
```

---

#### Message: `update-icon`

**Sender**: Settings page (after changes)

**Payload**:
```javascript
{
  type: 'update-icon'
}
```

**Response**: None

**Handler Contract**:
```javascript
if (request.type === 'update-icon') {
  updateIcon();
}
```

**Effect**: Updates browser action badge and icon based on `disabled` state

---

#### Message: `toggle-sync`

**Sender**: Settings page

**Payload**:
```javascript
{
  type: 'toggle-sync',
  isSyncEnabled: boolean
}
```

**Response**:
```javascript
{
  message: "sync-enabled"
}
// OR:
{
  message: "sync-disabled"
}
// OR (on error):
{
  message: "Sync Not Possible - size of Redirects larger than what's allowed by Sync"
}
```

**Handler Contract**: See `isSyncEnabled` key above

---

## Storage Change Events

### Event: `redirects` changed

**Trigger**: User saves changes in settings page, import completes

**Payload**:
```javascript
{
  redirects: {
    oldValue: [...],
    newValue: [...]
  }
}
```

**Handler Contract**:
```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.redirects) {
    log('Redirects have changed, setting up listener again');
    setUpRedirectListener();
  }
});
```

**Effect**: Background worker reloads redirects, recreates partitioned structure, re-registers listener

---

### Event: `disabled` changed

**Trigger**: User toggles extension in popup

**Payload**:
```javascript
{
  disabled: {
    oldValue: false,
    newValue: true
  }
}
```

**Handler Contract**:
```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.disabled) {
    updateIcon();
    if (changes.disabled.newValue == true) {
      log('Disabling Redirector, removing listener');
      chrome.webRequest.onBeforeRequest.removeListener(checkRedirects);
      chrome.webNavigation.onHistoryStateUpdated.removeListener(checkHistoryStateRedirects);
    } else {
      log('Enabling Redirector, setting up listener');
      setUpRedirectListener();
    }
  }
});
```

**Effect**: Enables/disables redirect interception

---

### Event: `logging` changed

**Trigger**: User toggles logging in popup

**Payload**:
```javascript
{
  logging: {
    oldValue: false,
    newValue: true
  }
}
```

**Handler Contract**:
```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.logging) {
    log.enabled = changes.logging.newValue;
    log('Logging settings have changed to ' + changes.logging.newValue, true);
  }
});
```

**Effect**: Enables/disables console logging

---

### Event: `enableNotifications` changed

**Trigger**: User toggles notifications in popup

**Payload**:
```javascript
{
  enableNotifications: {
    oldValue: false,
    newValue: true
  }
}
```

**Handler Contract**:
```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.enableNotifications) {
    log('notifications setting changed to ' + changes.enableNotifications.newValue);
    enableNotifications = changes.enableNotifications.newValue;
  }
});
```

**Effect**: Enables/disables desktop notifications

---

## Storage Quota Management

### Local Storage

**Quota**: Unlimited (typically 10MB+, varies by browser)

**Check**: `chrome.storage.local.QUOTA_BYTES` (usually undefined or very large)

**Strategy**: No quota checks needed, assume unlimited

---

### Sync Storage

**Quota**: 100KB total, 8KB per item

**Check**: `chrome.storage.sync.QUOTA_BYTES_PER_ITEM` = 8192

**Strategy**: Check size before enabling sync

**Size Check Contract**:
```javascript
chrome.storage.local.getBytesInUse("redirects", (size) => {
  if (size > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
    // Too large for sync
    showError("Redirects are too large for sync. Staying on local storage.");
  } else {
    // OK to sync
    enableSync();
  }
});
```

**Fallback**: If sync quota exceeded, fall back to local storage, show error to user

---

## MV2 vs MV3 Differences

### Identical Storage Contract

**Storage APIs**: 100% identical between MV2 and MV3
- chrome.storage.local: No changes
- chrome.storage.sync: No changes
- chrome.storage.onChanged: No changes

**Data Schema**: 100% identical
- Redirect object: No changes
- Settings keys: No changes
- Only additions: `migrationState`, `mv2_backup_<timestamp>` (MV3 only)

**Message Passing**: 100% identical
- chrome.runtime.sendMessage: No changes
- chrome.runtime.onMessage: No changes
- Message types: No changes

### Service Worker Differences

**State Persistence**:
- MV2: Background page runs continuously, keeps `partitionedRedirects` in memory
- MV3: Service worker shuts down, must reload from storage on wake

**Load Pattern**:
- MV2: Load once on startup, never reload (unless storage changes)
- MV3: Load once per wake (~30 seconds), cache for session

**Impact**: MV3 has ~50-100ms cold start latency on first redirect after wake

---

## Testing Contract

### Test: Empty State

**Setup**:
```javascript
await chrome.storage.local.clear();
```

**Expected**:
```javascript
const data = await chrome.storage.local.get({
  redirects: [],
  disabled: false,
  logging: false,
  enableNotifications: false,
  isSyncEnabled: false
});
// data should match defaults
```

---

### Test: Save and Load

**Setup**:
```javascript
const testRedirect = {
  description: "Test",
  exampleUrl: "http://example.com",
  includePattern: "http://example.com/*",
  excludePattern: "",
  redirectUrl: "https://example.org/$1",
  patternType: "W",
  processMatches: "noProcessing",
  disabled: false,
  grouped: false,
  appliesTo: ["main_frame"]
};

await chrome.storage.local.set({redirects: [testRedirect]});
```

**Expected**:
```javascript
const {redirects} = await chrome.storage.local.get({redirects: []});
assert(redirects.length === 1);
assert(redirects[0].description === "Test");
```

---

### Test: Storage Change Event

**Setup**:
```javascript
let changeDetected = false;
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.disabled) {
    changeDetected = true;
  }
});

await chrome.storage.local.set({disabled: true});
```

**Expected**:
```javascript
// Wait for async event
await delay(100);
assert(changeDetected === true);
```

---

### Test: Message Passing

**Setup**:
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get-redirects') {
    sendResponse({redirects: []});
  }
  return true;
});

const response = await chrome.runtime.sendMessage({type: 'get-redirects'});
```

**Expected**:
```javascript
assert(Array.isArray(response.redirects));
```

---

## Error Handling Contract

### Storage Read Errors

**Scenario**: chrome.storage.local.get fails (rare, but possible)

**Contract**:
```javascript
try {
  const data = await chrome.storage.local.get({redirects: []});
  // Use data
} catch (error) {
  console.error('Failed to read redirects:', error);
  // Fallback: Use empty array, show error to user
  partitionedRedirects = {};
}
```

---

### Storage Write Errors

**Scenario**: Quota exceeded, storage unavailable

**Contract**:
```javascript
chrome.storage.local.set({redirects: data}, () => {
  if (chrome.runtime.lastError) {
    console.error('Failed to save redirects:', chrome.runtime.lastError.message);
    sendResponse({message: chrome.runtime.lastError.message});
  } else {
    sendResponse({message: "Redirects saved"});
  }
});
```

---

### Corrupted Data

**Scenario**: chrome.storage contains invalid JSON or malformed data

**Contract**:
```javascript
const {redirects = []} = await chrome.storage.local.get({redirects: []});

const validRedirects = redirects.filter(r => {
  try {
    const redirect = new Redirect(r);
    redirect.updateExampleResult();
    return redirect.error === null;
  } catch (error) {
    console.error('Invalid redirect:', r, error);
    return false;
  }
});

if (validRedirects.length < redirects.length) {
  console.warn(`Filtered out ${redirects.length - validRedirects.length} invalid redirects`);
  // Optionally: Save cleaned data
  await chrome.storage.local.set({redirects: validRedirects});
}
```

---

## Summary

**Key Contracts**:
1. **Storage Schema**: Identical between MV2 and MV3 (only additions, no changes)
2. **Message Passing**: Identical between MV2 and MV3
3. **Storage Events**: Background worker reacts to changes, UI triggers via writes
4. **Quota Management**: Sync requires size checks, local is unlimited
5. **Migration Safety**: Automatic backup, rollback capability, no data transformation
6. **Error Handling**: Graceful degradation, fallback to defaults, user notifications

**Constitution Compliance**:
- ✅ Principle II (User Data is Sacred): Automatic backup, rollback, validation
- ✅ Principle IV (Minimal Viable Change): Zero schema changes, only additions
- ✅ Principle VII (Backward Compatibility): MV3 → MV2 data export/import works

**Next**: Generate quickstart.md with testing procedures and deployment checklist.
