# Data Model: Redirector Storage Schema

**Date**: 2025-12-22
**Branch**: 001-mv3-migration
**Status**: Stable (No changes from MV2)

## Purpose

Document the data model for Redirector redirect rules, settings, and migration state. This schema is **identical** between MV2 and MV3 to ensure rollback capability and zero data loss (Constitution Principles II and VII).

## Core Entities

### Redirect Rule

Represents a single URL redirect configuration with pattern matching, transformation options, and metadata.

**Schema**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `description` | string | Yes | "" | User-friendly name for the rule (e.g., "De-mobilizer") |
| `exampleUrl` | string | Yes | "" | Example URL for pattern validation and testing |
| `exampleResult` | string | No | "" | Result of applying redirect to exampleUrl (computed) |
| `error` | string \| null | No | null | Validation error message if pattern is invalid |
| `includePattern` | string | Yes | "" | Pattern to match URLs against (regex or wildcard) |
| `excludePattern` | string | No | "" | Pattern to exclude matched URLs (optional) |
| `patternDesc` | string | No | "" | User description of what the pattern does |
| `redirectUrl` | string | Yes | "" | Target URL with capture group placeholders ($1, $2, etc.) |
| `patternType` | 'W' \| 'R' | Yes | 'W' | Pattern type: 'W' = Wildcard, 'R' = Regular Expression |
| `processMatches` | ProcessingOption | Yes | 'noProcessing' | How to process capture group matches before substitution |
| `disabled` | boolean | No | false | If true, rule is not evaluated (user-toggleable) |
| `grouped` | boolean | No | false | If true, rule is selected for batch operations (UI state) |
| `appliesTo` | RequestType[] | Yes | ['main_frame'] | Request types this rule applies to |

**ProcessingOption** (enum):
- `'noProcessing'`: Use capture groups as-is
- `'urlEncode'`: Apply `encodeURIComponent()` to each capture group
- `'urlDecode'`: Apply `unescape()` to each capture group (legacy URL decoding)
- `'doubleUrlDecode'`: Apply `unescape(unescape())` for double-encoded URLs
- `'base64decode'`: Apply `atob()` for base64-encoded capture groups

**RequestType** (enum):
- `'main_frame'`: Main browser window (address bar navigation)
- `'sub_frame'`: iframes
- `'stylesheet'`: CSS files
- `'font'`: Font files
- `'script'`: JavaScript files
- `'image'`: Images (JPEG, PNG, GIF, etc.)
- `'imageset'`: Responsive images (Firefox only)
- `'media'`: Audio and video files
- `'object'`: Flash content, Java applets
- `'object_subrequest'`: Requests from object elements
- `'xmlhttprequest'`: AJAX requests
- `'history'`: History state changes (SPA navigation)
- `'other'`: Any other request type

**JSON Example**:
```json
{
  "description": "De-mobilizer",
  "exampleUrl": "https://en.m.wikipedia.org/wiki/Example",
  "exampleResult": "https://en.wikipedia.org/wiki/Example",
  "error": null,
  "includePattern": "^(https?://)([a-z0-9-]*\\.)m\\.(.*)$",
  "excludePattern": "",
  "patternDesc": "Remove mobile subdomain from URLs",
  "redirectUrl": "$1$2$3",
  "patternType": "R",
  "processMatches": "noProcessing",
  "disabled": false,
  "grouped": false,
  "appliesTo": ["main_frame", "sub_frame"]
}
```

**Validation Rules**:
1. `includePattern` must be non-empty
2. If `patternType === 'R'`, `includePattern` must be valid regex
3. If `excludePattern` is non-empty and `patternType === 'R'`, it must be valid regex
4. `redirectUrl` must be non-empty
5. `appliesTo` must contain at least one request type
6. `exampleUrl` must produce valid `exampleResult` (no `error` field)

**Runtime Compiled Fields** (not stored):
- `_rxInclude`: Compiled RegExp for `includePattern`
- `_rxExclude`: Compiled RegExp for `excludePattern` (if provided)
- `patternTypeText`: Human-readable pattern type ('Wildcard' or 'Regular Expression')
- `appliesToText`: Human-readable request types (e.g., "Main window, iframes")
- `processMatchesExampleText`: Example of processing transformation

---

### Storage Keys

Data persisted in `chrome.storage.local` or `chrome.storage.sync`.

| Key | Type | Storage | Description |
|-----|------|---------|-------------|
| `redirects` | Redirect[] | local or sync | Array of all redirect rules (main data) |
| `disabled` | boolean | local | Global extension enable/disable flag |
| `logging` | boolean | local | Console logging enable flag (for debugging) |
| `enableNotifications` | boolean | local | Desktop notifications enable flag |
| `isSyncEnabled` | boolean | local | Storage mode preference (local vs sync) |
| `mv2_backup_<timestamp>` | object | local | Automatic backup before MV3 migration (new in MV3) |

**Storage Constraints**:
- `chrome.storage.local`: Unlimited (typically 10MB+)
- `chrome.storage.sync`: 100KB total, 8KB per item (`QUOTA_BYTES_PER_ITEM`)
- If `redirects` exceeds sync quota, user shown error and kept on local storage

**Storage Access Patterns**:
1. **Background/Service Worker**: Reads `redirects` on wake, reads settings on startup
2. **Settings Page**: Reads/writes `redirects`, reads/writes `isSyncEnabled`
3. **Popup Page**: Reads/writes `disabled`, `logging`, `enableNotifications`

---

### Migration State (New in MV3)

Tracks MV2 → MV3 migration progress and enables rollback.

**Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Extension version that performed migration (e.g., "4.0.0") |
| `migratedFrom` | string | Previous extension version (e.g., "3.5.4") |
| `timestamp` | number | Unix timestamp of migration (milliseconds) |
| `redirectsCount` | number | Number of redirect rules migrated |
| `backupKey` | string | Storage key containing backup (e.g., "mv2_backup_1735171200000") |
| `status` | 'complete' \| 'failed' | Migration outcome |
| `errors` | string[] | Array of error messages if migration failed |

**Storage Key**: `migrationState` (stored in `chrome.storage.local`)

**JSON Example**:
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

**Backup Format** (stored in `chrome.storage.local` under `mv2_backup_<timestamp>`):
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
    "browser": "Chrome"
  }
}
```

---

### Export/Import Format

JSON format for exporting and importing redirect rules. **Identical** between MV2 and MV3.

**Schema**:

| Field | Type | Description |
|-------|------|-------------|
| `createdBy` | string | Extension name and version (e.g., "Redirector v3.5.4") |
| `createdAt` | Date | ISO 8601 timestamp of export |
| `redirects` | Redirect[] | Array of redirect rule objects |

**JSON Example**:
```json
{
  "createdBy": "Redirector v4.0.0",
  "createdAt": "2025-12-22T10:30:00.000Z",
  "redirects": [
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
      "appliesTo": ["main_frame"]
    }
  ]
}
```

**Import Behavior**:
1. Parse JSON, validate structure
2. For each redirect in import:
   - Create `Redirect` object
   - Validate pattern syntax (`updateExampleResult()`)
   - Check if rule already exists (`equals()` comparison)
   - If duplicate: Skip with warning
   - If unique: Add to `REDIRECTS` array
3. Save to storage
4. Show summary: "Imported X redirects, Y already existed"

**Export Behavior**:
1. Read all redirects from `REDIRECTS` array
2. Serialize to `Redirect.toObject()` for each
3. Create JSON with metadata
4. Generate data URI: `data:text/plain;charset=utf-8,${encodeURIComponent(json)}`
5. Trigger download via `<a>` element with `download="redirector-rules-${timestamp}.json"`

**Compatibility**:
- MV2 exports can be imported into MV3
- MV3 exports can be imported into MV2
- No version-specific fields (all fields understood by both versions)

---

## Data Relationships

```
┌─────────────────────────────────────────────┐
│ chrome.storage.local                        │
├─────────────────────────────────────────────┤
│ redirects: [                                │
│   {Redirect}, {Redirect}, ... (main data)  │
│ ]                                           │
│ disabled: boolean                           │
│ logging: boolean                            │
│ enableNotifications: boolean                │
│ isSyncEnabled: boolean                      │
│ migrationState: {MigrationState} (MV3 only)│
│ mv2_backup_<ts>: {Backup} (MV3 only)       │
└─────────────────────────────────────────────┘
                    ↓
          ┌─────────────────────┐
          │ Background Worker   │
          ├─────────────────────┤
          │ Loads on wake:      │
          │ - redirects[]       │
          │ - disabled          │
          │ - logging           │
          │ Compiles:           │
          │ - partitionedRedirects │
          └─────────────────────┘
                    ↓
          ┌─────────────────────┐
          │ Request Event       │
          ├─────────────────────┤
          │ chrome.webRequest   │
          │ .onBeforeRequest    │
          └─────────────────────┘
                    ↓
          ┌─────────────────────┐
          │ Pattern Matching    │
          ├─────────────────────┤
          │ redirect.getMatch() │
          │ - Compile patterns  │
          │ - Test include      │
          │ - Test exclude      │
          │ - Process matches   │
          │ - Return redirectUrl │
          └─────────────────────┘
                    ↓
          ┌─────────────────────┐
          │ Redirect Action     │
          ├─────────────────────┤
          │ chrome.tabs.update  │
          │ ({url: redirectUrl})│
          └─────────────────────┘
```

---

## State Transitions

### Extension Lifecycle

```
Extension Installed/Updated (MV3)
    ↓
chrome.runtime.onInstalled fires
    ↓
Check if migration needed
    ├─ If update from MV2 (v3.x → v4.0):
    │   ├─ Create backup: mv2_backup_<timestamp>
    │   ├─ Copy redirects, settings to backup
    │   ├─ Create migrationState record
    │   └─ (No data transformation needed)
    │
    └─ If fresh install or MV3 update:
        └─ Skip migration
    ↓
Service Worker Ready
    ↓
On webRequest event:
    ├─ ensureRedirectsLoaded()
    │   ├─ Read redirects from chrome.storage.local
    │   ├─ Compile patterns (createPartitionedRedirects)
    │   └─ Cache in memory
    │
    └─ checkRedirects(details)
        ├─ Get rules for request type
        ├─ For each rule: getMatch(url)
        └─ Return {redirectUrl} or {}
```

### Storage Sync Toggle

```
User clicks "Enable Sync" (Settings Page)
    ↓
Check redirects size
    ├─ If size > QUOTA_BYTES_PER_ITEM:
    │   ├─ Show error message
    │   ├─ Keep on chrome.storage.local
    │   └─ Set isSyncEnabled = false
    │
    └─ If size OK:
        ├─ Copy redirects to chrome.storage.sync
        ├─ Remove from chrome.storage.local
        ├─ Set isSyncEnabled = true
        └─ Background worker switches storageArea
```

### Rule Enable/Disable

```
User toggles "Disabled" checkbox (Settings Page)
    ↓
Update redirect.disabled field
    ↓
Save to chrome.storage
    ↓
chrome.storage.onChanged fires
    ↓
Background worker receives change
    ↓
Re-creates partitionedRedirects (includes disabled rules but marks them)
    ↓
On redirect check:
    └─ getMatch(url, forceIgnoreDisabled=false) checks disabled flag
        └─ Returns {isDisabledMatch: true} if disabled
```

---

## Data Integrity Constraints

### Mandatory Validations

1. **Pattern Syntax**:
   - Wildcard patterns: No validation needed (converted to regex)
   - Regex patterns: Must compile without throwing exception
   - Test: `new RegExp(pattern, 'gi')` succeeds

2. **Pattern Matching**:
   - Include pattern must match example URL
   - Exclude pattern (if provided) must NOT match example URL
   - Redirect URL must produce valid result
   - Test: `redirect.updateExampleResult()` succeeds with no `error` field

3. **Request Types**:
   - `appliesTo` array must be non-empty
   - All request types must be valid (from enum)
   - Browser-specific types (e.g., 'imageset') handled gracefully

4. **Capture Groups**:
   - Redirect URL may reference $1, $2, ..., $9
   - Referenced groups must exist in matched pattern
   - Example: Pattern `^(https?)://(.*)$` can use $1 and $2, not $3

5. **Storage Quota**:
   - Redirects array must fit in storage quota
   - For sync: Total size < 100KB, single item < 8KB
   - If exceeds: Warning shown, fallback to local storage

### Optional Validations

1. **Loop Detection** (runtime):
   - Same URL redirected ≥3 times within 3 seconds → block redirect
   - Prevents infinite redirect chains
   - User must fix conflicting rules

2. **Conflicting Rules** (UI warning):
   - Multiple rules with overlapping include patterns
   - First match wins (rule order matters)
   - UI could warn but not block

---

## Migration Scenarios

### Scenario 1: Fresh Install (No Migration)

**Input**: User installs Redirector v4.0.0 (MV3) for first time
**Action**: None required
**Output**: Empty storage, ready for user to add rules
**Test**: Install extension, verify empty state, add rule, verify it works

### Scenario 2: MV2 → MV3 Upgrade (Automatic Migration)

**Input**: User has Redirector v3.5.4 (MV2) with 50 rules
**Action**:
1. chrome.runtime.onInstalled fires with `reason: 'update'`
2. Detect upgrade from MV2 (version < 4.0.0)
3. Create backup: `mv2_backup_1735171200000` with all data
4. Create `migrationState` record
5. Data stays in place (no transformation needed)
**Output**: All 50 rules work identically in MV3, backup preserved
**Test**: Upgrade from 3.5.4 → 4.0.0, verify all rules, export and compare

### Scenario 3: MV3 → MV2 Rollback (User-Initiated)

**Input**: User experiences issue with MV3, wants to revert
**Action**:
1. User exports redirects from MV3 (or uses automatic backup)
2. User uninstalls MV3, installs MV2 v3.5.4
3. User imports exported JSON
4. All rules restored
**Output**: User back on MV2 with all data intact
**Test**: Export from MV3, import into MV2, verify identical behavior

### Scenario 4: Corrupted Data (Error Handling)

**Input**: chrome.storage contains malformed JSON
**Action**:
1. Migration detects corrupted data
2. Creates backup of corrupted state (for debugging)
3. Attempts to preserve valid rules, skip invalid ones
4. Sets `migrationState.status = 'failed'` with error details
5. Shows user error message with recovery instructions
**Output**: Valid rules preserved, user notified, backup available
**Test**: Inject malformed JSON, upgrade, verify error handling

---

## Rollback Procedure

### Data Rollback from Automatic Backup

**Scenario**: Migration failed or user wants to revert

**Steps**:
1. Find backup key: `mv2_backup_<timestamp>` in chrome.storage.local
2. Read backup data
3. Restore fields:
   - `redirects` → chrome.storage.local.redirects
   - `disabled` → chrome.storage.local.disabled
   - `logging` → chrome.storage.local.logging
   - `enableNotifications` → chrome.storage.local.enableNotifications
   - `isSyncEnabled` → chrome.storage.local.isSyncEnabled
4. Delete `migrationState` key
5. Reload extension or restart browser

**Code Example**:
```javascript
async function rollbackFromBackup(backupKey) {
  const backup = await chrome.storage.local.get(backupKey);
  const {redirects, disabled, logging, enableNotifications, isSyncEnabled} = backup[backupKey];

  await chrome.storage.local.set({
    redirects,
    disabled,
    logging,
    enableNotifications,
    isSyncEnabled
  });

  await chrome.storage.local.remove(['migrationState']);
  console.log('Rollback complete. Please reload the extension.');
}
```

---

## Performance Considerations

### Storage Read Performance

**MV2 (Persistent Background)**:
- Reads redirects once on extension startup
- Keeps in memory indefinitely
- Zero storage reads during redirects

**MV3 (Service Worker)**:
- Reads redirects once per wake (every ~30 seconds)
- Caches in memory for wake session
- ~50-100ms cold start latency

**Optimization**:
- Pre-compile patterns on load (not per-request)
- Use chrome.storage.local (faster than sync)
- Cache partitionedRedirects structure

### Memory Usage

**Per Redirect Rule**:
- Object: ~500 bytes (without compiled patterns)
- Compiled RegExp: ~200 bytes
- Total: ~700 bytes per rule

**100 Rules**:
- Storage: ~50KB
- Memory: ~70KB (with compiled patterns)
- Acceptable overhead

### Storage Write Performance

**Frequency**: Only when user saves changes (rare)
**Latency**: ~10-50ms for chrome.storage.local
**Sync Latency**: ~100-500ms for chrome.storage.sync (network round-trip)

---

## Security Considerations

### Data Validation

1. **Pattern Injection**: Validate regex syntax before compiling
2. **XSS Prevention**: Sanitize `description` and `patternDesc` before display
3. **Storage Tampering**: Validate data read from chrome.storage (handle corruption)

### Permissions

**MV2 Permissions**:
- `webRequest`, `webRequestBlocking`: Intercept and redirect
- `storage`: Persist redirect rules
- `tabs`: Get tab info, update URLs
- `webNavigation`: History state redirects
- `notifications`: User feedback
- `http://*/*`, `https://*/*`: All HTTP/HTTPS URLs

**MV3 Permissions** (changes):
- Remove `webRequestBlocking` (not available in MV3)
- Move `http://*/*`, `https://*/*` to `host_permissions`
- All other permissions unchanged

---

## Testing Data

### Test Dataset 1: Empty State
```json
{
  "redirects": [],
  "disabled": false,
  "logging": false,
  "enableNotifications": false,
  "isSyncEnabled": false
}
```

### Test Dataset 2: Single Simple Rule
```json
{
  "redirects": [
    {
      "description": "Test Redirect",
      "exampleUrl": "http://example.com/test",
      "includePattern": "http://example.com/*",
      "excludePattern": "",
      "redirectUrl": "https://example.org/$1",
      "patternType": "W",
      "processMatches": "noProcessing",
      "disabled": false,
      "grouped": false,
      "appliesTo": ["main_frame"]
    }
  ],
  "disabled": false
}
```

### Test Dataset 3: Complex Rules (100+)
- See README.md examples (de-mobilizer, AMP redirect, etc.)
- Generate via script: 100 variations of patterns
- Test performance and storage limits

---

## Summary

**Key Points**:
1. **No schema changes**: Redirect object identical in MV2 and MV3
2. **Rollback capability**: Automatic backup preserves MV2 data
3. **Zero data loss**: No transformations, no deletions, only additions (backup, migrationState)
4. **Export/import unchanged**: JSON format compatible between versions
5. **Performance impact**: Minimal (only service worker wake adds ~50-100ms cold start)

**Constitution Compliance**:
- ✅ Principle II (User Data is Sacred): Automatic backup, rollback capability
- ✅ Principle III (Stability Over Features): Zero schema changes
- ✅ Principle IV (Minimal Viable Change): Only add backup fields, don't modify existing
- ✅ Principle VII (Backward Compatibility): MV3 → MV2 rollback proven

**Next**: Generate contracts/storage-contract.md with detailed API specifications.
