# Export/Import Baseline Test

**Date**: 2025-12-22
**Purpose**: Verify MV2 export/import functionality as baseline
**Version**: MV2 v3.5.4

---

## Test Objective

Establish that MV2 export/import works correctly before MV3 migration. This ensures:
1. Export format is documented and understood
2. Import process is reliable
3. MV3 maintains 100% compatibility with MV2 export format (SC-004, SC-008)

---

## Test Procedure

### Test 1: Export Empty Rule Set

**Steps**:
1. Load MV2 v3.5.4 with 0 redirect rules
2. Open settings page → Export Redirects
3. Save file as `test-export-empty.json`
4. Inspect JSON structure

**Expected Export Structure**:
```json
{
  "createdBy": "Redirector v3.5.4",
  "createdAt": "2025-12-22T...",
  "redirects": []
}
```

**Validation**:
- [ ] `createdBy` field present with version
- [ ] `createdAt` field present with ISO timestamp
- [ ] `redirects` array is empty
- [ ] Valid JSON (no syntax errors)

---

### Test 2: Export 10 Rules (Diverse Patterns)

**Steps**:
1. Load MV2 v3.5.4
2. Import `tests/baseline/datasets/baseline-10-rules.json`
3. Verify all 10 rules appear in settings page
4. Export Redirects → Save as `test-export-10-rules.json`
5. Compare exported file to original import

**Validation**:
- [ ] All 10 rules present in export
- [ ] Rule order preserved
- [ ] All fields preserved:
  - [ ] description
  - [ ] exampleUrl / exampleResult
  - [ ] includePattern / excludePattern
  - [ ] redirectUrl
  - [ ] patternType (R for regex, W for wildcard)
  - [ ] processMatches (noProcessing, urlDecode, urlEncode, base64Decode, etc.)
  - [ ] disabled state
  - [ ] appliesTo array (request types)
- [ ] JSON structure matches import format
- [ ] No data loss or corruption

**Diff Check**:
```bash
# Normalize timestamps, then compare
diff <(jq 'del(.createdAt, .createdBy)' baseline-10-rules.json) \
     <(jq 'del(.createdAt, .createdBy)' test-export-10-rules.json)
# Should show NO differences (exit code 0)
```

---

### Test 3: Export 100 Rules (Load Test)

**Steps**:
1. Import `tests/baseline/datasets/baseline-100-rules.json`
2. Verify extension handles 100 rules without errors
3. Export → Save as `test-export-100-rules.json`
4. Verify file size and structure

**Validation**:
- [ ] All 100 rules present
- [ ] File size reasonable (~70-100 KB)
- [ ] Export completes in < 5 seconds
- [ ] No browser freeze or crash
- [ ] Valid JSON structure

---

### Test 4: Import Empty File

**Steps**:
1. Clear all existing rules
2. Import `tests/baseline/datasets/baseline-empty.json`
3. Verify settings page shows 0 rules

**Validation**:
- [ ] No errors during import
- [ ] Settings page empty
- [ ] Extension still functional (can add new rules)

---

### Test 5: Import 10 Rules

**Steps**:
1. Clear all existing rules
2. Import `tests/baseline/datasets/baseline-10-rules.json`
3. Verify all rules appear in settings
4. Test each redirect manually

**Validation**:
- [ ] All 10 rules imported successfully
- [ ] Rule descriptions match
- [ ] Example URLs match
- [ ] Pattern types correct (regex vs wildcard)
- [ ] Disabled states preserved (rule #8 should be disabled)
- [ ] Request types preserved
- [ ] Test de-mobilizer redirect: https://en.m.wikipedia.org/ → https://en.wikipedia.org/
- [ ] Test AMP redirect works
- [ ] Test disabled rule does NOT redirect

---

### Test 6: Import 100 Rules

**Steps**:
1. Clear all existing rules
2. Import `tests/baseline/datasets/baseline-100-rules.json`
3. Verify extension handles large import

**Validation**:
- [ ] All 100 rules imported
- [ ] Import completes in < 5 seconds
- [ ] No browser freeze
- [ ] Settings page loads normally (may be slow, acceptable)
- [ ] Search/filter works in settings
- [ ] Test rule #1 (de-mobilizer) works

---

### Test 7: Re-export After Import (Round-trip Test)

**Steps**:
1. Import `baseline-10-rules.json`
2. Export → Save as `roundtrip-export.json`
3. Compare to original

**Validation**:
```bash
diff <(jq 'del(.createdAt, .createdBy)' baseline-10-rules.json) \
     <(jq 'del(.createdAt, .createdBy)' roundtrip-export.json)
# Should be IDENTICAL (exit code 0)
```

**Critical**: This proves data fidelity through import/export cycle.

---

### Test 8: Cross-Version Import (MV2 → MV2)

**Steps**:
1. Export from MV2 v3.5.4
2. Install fresh MV2 v3.5.4 (different profile)
3. Import exported file
4. Verify identical behavior

**Validation**:
- [ ] All rules work identically
- [ ] No warnings or errors
- [ ] Version field updated to current version

---

## MV3 Compatibility Requirements (Future)

**SC-004**: Users can export rules from MV3 and import into MV2 with 100% fidelity

When testing MV3 migration:
1. Export from MV3 v4.0.0
2. Import into MV2 v3.5.4
3. Verify ALL rules work identically
4. **CRITICAL**: Zero data loss, zero behavior change

**SC-008**: JSON format compatibility maintained between MV2 and MV3

- Export format MUST be identical
- Only `createdBy` version field should differ
- All rule fields preserved
- Import/export round-trip must be lossless

---

## Known Issues and Edge Cases

### Empty Fields
- Empty `excludePattern` should export as empty string `""`
- Empty `exampleUrl` acceptable for some rules
- `error` field usually `null`

### Pattern Escaping
- Regex special characters properly escaped in JSON
- Backslashes doubled: `\.` → `\\.`
- Test import of complex patterns with `\`, `$`, `^`, etc.

### Request Types
- `appliesTo` array can contain:
  - `main_frame`
  - `sub_frame`
  - `stylesheet`
  - `script`
  - `image`
  - `media`
  - `xmlhttprequest`
  - `history` (special - for SPA redirects)
  - `other`
- Firefox-specific: `imageset` (Chrome should ignore gracefully)

### Process Matches Options
- `noProcessing` (default)
- `urlDecode`
- `urlEncode`
- `doubleUrlDecode`
- `base64Decode`

---

## Test Results

**Date Tested**: [YYYY-MM-DD]
**Tester**: [NAME]
**Browser**: Chrome [VERSION]

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Export Empty | [ ] PASS / [ ] FAIL | |
| Test 2: Export 10 Rules | [ ] PASS / [ ] FAIL | |
| Test 3: Export 100 Rules | [ ] PASS / [ ] FAIL | |
| Test 4: Import Empty | [ ] PASS / [ ] FAIL | |
| Test 5: Import 10 Rules | [ ] PASS / [ ] FAIL | |
| Test 6: Import 100 Rules | [ ] PASS / [ ] FAIL | |
| Test 7: Round-trip | [ ] PASS / [ ] FAIL | |
| Test 8: Cross-version | [ ] PASS / [ ] FAIL | |

**Overall Status**: [ ] ALL PASS (baseline established) / [ ] FAILURES (investigate)

**Failures**: [Describe any failures and root cause]

---

## Next Steps

After establishing MV2 baseline:
1. ✅ Document export format structure
2. ✅ Verify import reliability
3. ⏳ Implement MV3 migration
4. ⏳ Test MV3 export/import compatibility
5. ⏳ Verify MV3 → MV2 rollback works (Phase N-1)

**Status**: ⏳ BASELINE TESTING PENDING

Complete manual testing before proceeding to MV3 implementation.
