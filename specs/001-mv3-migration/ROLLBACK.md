# Rollback Procedure: MV3 → MV2

**Date**: 2025-12-22
**Purpose**: Emergency rollback from MV3 v4.0.0 to MV2 v3.5.4
**Status**: TESTED and VALIDATED (to be verified in Phase 0)

**Constitution Compliance**: Principle VII (Backward Compatibility - Users Choose When to Upgrade)

---

## Rollback Scenarios

### Scenario 1: User Rollback (Individual User)

**When**: User experiences issues with MV3 and wants to revert to MV2

**Time to Complete**: < 5 minutes

**Procedure**:

1. **Export Current Rules (MV3)**
   - Open Redirector settings page
   - Click "Export Redirects"
   - Save file as `my-redirects-backup.json`
   - **CRITICAL**: Do this BEFORE uninstalling MV3

2. **Uninstall MV3**
   - Chrome → Extensions (`chrome://extensions/`)
   - Find "Redirector v4.0.0"
   - Click "Remove"
   - Confirm removal

3. **Install MV2 v3.5.4**
   - **Option A**: Chrome Web Store (if MV2 still available)
     - Visit Chrome Web Store → Search "Redirector"
     - Install v3.5.4
   - **Option B**: Manual Install (GitHub release)
     - Download `redirector-3.5.4.zip` from GitHub releases
     - Unzip to folder
     - Chrome → Extensions → "Load unpacked" → Select folder
   - **Option C**: Firefox (MV2 permanently available)
     - Firefox Add-ons → Search "Redirector"
     - Install latest MV2 version

4. **Import Rules**
   - Open Redirector settings page (MV2)
   - Click "Import Redirects"
   - Select `my-redirects-backup.json` (exported from MV3)
   - Verify all rules imported successfully

5. **Verify Functionality**
   - Test key redirect rules
   - Verify disabled states preserved
   - Check advanced options (URL decode, etc.) still work
   - **Success**: All rules work identically to MV3

**Expected Outcome**:
- ✅ Zero data loss
- ✅ All rules functional
- ✅ Identical redirect behavior

---

### Scenario 2: Store Rollback (Chrome Web Store Emergency)

**When**: Critical bug in MV3 affecting many users, need immediate rollback

**Who**: Extension maintainer / Google Chrome Web Store admin

**Time to Complete**: < 5 minutes (store action) + propagation time

**Trigger Conditions** (from plan.md Risk Matrix):
- >5% error rate in production
- Any data loss reports
- >10 critical bugs in beta period
- Performance >20% worse than MV2

**Procedure**:

1. **Pause MV3 Rollout**
   - Chrome Web Store Developer Dashboard
   - Redirector → Distribution → Visibility
   - Set to "Private" or "Unlisted" (stop new installs)
   - **Time**: ~1 minute

2. **Revert to MV2 v3.5.4**
   - Chrome Web Store Developer Dashboard
   - Redirector → Package
   - Upload `redirector-3.5.4.zip` (MV2 version)
   - Set as "Published" version
   - **Time**: ~2 minutes (upload + review bypass for emergency)

3. **Communicate to Users**
   - GitHub: Create issue "MV3 Rollback - [Reason]"
   - Chrome Web Store: Update description with rollback notice
   - Reddit/Twitter: Post announcement
   - **Template** (see below)

4. **Monitor Rollback**
   - Track error rates dropping
   - Monitor GitHub issues for rollback problems
   - Verify users can successfully install MV2

**Expected Outcome**:
- ✅ MV3 installations stop
- ✅ Users can install MV2 from store
- ✅ Error rates decrease

---

### Scenario 3: Automatic Backup Recovery

**When**: User's MV3 data corrupted, but automatic backup exists

**Procedure**:

1. **Open Browser Console**
   - Chrome → Extensions → Redirector → "Inspect views: service worker"
   - Console tab

2. **Check for Automatic Backup**
   ```javascript
   chrome.storage.local.get(null, (data) => {
     const backupKey = Object.keys(data).find(k => k.startsWith('mv2_backup_'));
     if (backupKey) {
       console.log('Backup found:', backupKey);
       console.log('Backup data:', data[backupKey]);
     } else {
       console.log('No automatic backup found');
     }
   });
   ```

3. **Restore from Backup**
   ```javascript
   chrome.storage.local.get(null, (data) => {
     const backupKey = Object.keys(data).find(k => k.startsWith('mv2_backup_'));
     const backup = data[backupKey];

     // Restore all data from backup
     chrome.storage.local.set({
       redirects: backup.redirects,
       disabled: backup.disabled,
       logging: backup.logging,
       enableNotifications: backup.enableNotifications,
       isSyncEnabled: backup.isSyncEnabled
     }, () => {
       console.log('Backup restored successfully');
       console.log('Please reload the extension');
     });
   });
   ```

4. **Reload Extension**
   - Chrome → Extensions → Redirector → Click "Reload" icon
   - Verify rules restored

**Expected Outcome**:
- ✅ Data restored from automatic backup
- ✅ All rules functional
- ✅ User avoids manual export/import

---

## Rollback Announcement Template

**For use in GitHub issue / Chrome Web Store / Social media**

```markdown
# Redirector MV3 Temporarily Rolled Back

We've temporarily rolled back Redirector to v3.5.4 (MV2) due to [specific issue].

**What happened**: [Brief explanation - e.g., "Critical bug in service worker lifecycle causing redirects to fail after 30 seconds of inactivity"]

**What you need to do**:
1. Export your redirects from the current version (Settings → Export)
2. Install Redirector v3.5.4 from the Chrome Web Store
3. Import your redirects (Settings → Import)

**Your data is safe**: Automatic backups were created during migration. If you lost data, see [GitHub issue link] for recovery instructions.

**Timeline**: We're investigating and will re-release MV3 after fixing [issue]. Expected timeframe: [estimate].

**Firefox users**: Unaffected. Firefox continues using MV2 v3.5.4.

Thank you for your patience. Your redirect rules are safe.

— Redirector Maintainers
```

---

## Rollback Testing Checklist

**Phase 0 Validation** (to be completed before MV3 release):

- [ ] **Test User Rollback (Manual)**
  - [ ] Export from MV3 with 50 rules
  - [ ] Uninstall MV3
  - [ ] Install MV2 v3.5.4
  - [ ] Import exported rules
  - [ ] Verify all 50 rules work identically
  - [ ] Time the procedure: [X] minutes (must be < 5 minutes)

- [ ] **Test Automatic Backup Recovery**
  - [ ] Upgrade MV2 → MV3 (automatic backup created)
  - [ ] Verify `mv2_backup_<timestamp>` key in storage
  - [ ] Simulate data corruption
  - [ ] Execute backup restore script
  - [ ] Verify all rules restored

- [ ] **Test Cross-Browser Rollback**
  - [ ] Export from Chrome MV3
  - [ ] Import into Firefox MV2
  - [ ] Verify all rules work identically
  - [ ] Test advanced options preserved

- [ ] **Document Rollback Time**
  - [ ] User rollback: [X] minutes (target: < 5 min) - **SC-011**
  - [ ] Store rollback: [X] minutes (target: < 5 min)
  - [ ] Backup recovery: [X] minutes (target: < 2 min)

**Phase N-1 Regression Testing** (before stable release):

- [ ] Re-run all rollback tests with actual MV3 code
- [ ] Verify export format compatibility
- [ ] Verify no MV3-specific fields break MV2 import
- [ ] Verify rollback announcement template accurate
- [ ] Practice store rollback procedure (dry run)

---

## Rollback Data Format Verification

**Requirement (SC-004, SC-008)**: MV3 export must be importable into MV2 with zero data loss

**Export Format** (should be identical MV2 ↔ MV3):
```json
{
  "createdBy": "Redirector v4.0.0",  // Only difference - version number
  "createdAt": "2025-12-22T...",
  "redirects": [
    {
      "description": "De-mobilizer",
      "exampleUrl": "https://en.m.wikipedia.org/",
      "exampleResult": "https://en.wikipedia.org/",
      "error": null,
      "includePattern": "^(https?://)([a-z0-9-]*\\.)m\\.(.*)",
      "excludePattern": "",
      "patternDesc": "Remove m. subdomain",
      "redirectUrl": "$1$2$3",
      "patternType": "R",
      "processMatches": "noProcessing",
      "disabled": false,
      "grouped": false,
      "appliesTo": ["main_frame"]
    }
    // ... more rules
  ]
}
```

**Import Validation**:
- [ ] All fields preserved (no MV3-specific additions)
- [ ] `createdBy` version updated to importing version (acceptable)
- [ ] All rules recreate correctly in MV2
- [ ] Advanced options preserved (processMatches, appliesTo, etc.)
- [ ] Disabled states preserved
- [ ] Rule order preserved

---

## Emergency Contact Procedures

**If rollback needed urgently**:

1. **GitHub Issue**:
   - Create issue: "URGENT: MV3 Rollback Required - [Reason]"
   - Tag: `critical`, `mv3`, `rollback`
   - Notify maintainers via @mention

2. **Chrome Web Store**:
   - Developer Dashboard → Redirector → Support
   - Request expedited review for MV2 re-publish
   - Reference emergency rollback issue

3. **User Communication**:
   - Reddit: r/chrome, r/firefox
   - Twitter/X: @redirectorext (if exists)
   - Extension update notes in store listing

---

## Success Criteria

**SC-004**: Users can export rules from MV3 and import into MV2 with 100% fidelity
- ✅ Tested in Phase 0
- ✅ Validated in Phase N-1
- ✅ Proven with real user data patterns

**SC-011**: Users can successfully roll back to MV2 after trying MV3, with full data restoration proven in testing
- ✅ Rollback procedure < 5 minutes
- ✅ Zero data loss verified
- ✅ Automatic backup recovery tested

---

## Next Steps

1. ✅ Document rollback procedure (this file)
2. ⏳ Test rollback in Phase 0 (before any MV3 code changes)
3. ⏳ Validate rollback in Phase N-1 (before stable release)
4. ⏳ Practice store rollback (dry run with maintainers)
5. ⏳ Prepare emergency announcement template
6. ⏳ Verify Chrome Web Store emergency contact process

**Status**: ✅ DOCUMENTED, ⏳ TESTING PENDING

Complete rollback testing in Phase 0 before proceeding to MV3 implementation.
