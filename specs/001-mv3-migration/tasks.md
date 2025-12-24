---
description: "Implementation tasks for Manifest V3 Migration"
---

# Tasks: Manifest V3 Migration

**Input**: Design documents from `/specs/001-mv3-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/storage-contract.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 0: Pre-Migration Baseline (MANDATORY)

**Purpose**: Establish MV2 baseline and safety nets BEFORE any changes

**⚠️ CRITICAL**: This phase is REQUIRED per Constitution Principle V (Test Obsessively)

- [X] T000 Document current MV2 version (3.5.4) as rollback baseline in specs/001-mv3-migration/baseline-mv2-v3.5.4.md
- [X] T001 Create baseline test suite covering all README redirect examples in tests/baseline/readme-examples.js
- [X] T002 [P] Collect anonymized real user redirect rule exports: baseline-empty.json (0 rules), baseline-10-rules.json (10 rules), baseline-100-rules.json (100+ rules) in tests/baseline/datasets/
- [X] T003 [P] Measure baseline performance metrics (redirect latency p50/p95/p99, memory usage) and record in tests/baseline/performance-baseline.txt
- [X] T004 [P] Test export/import functionality in current MV2 version, document in tests/baseline/export-import-test.md
- [X] T005 Create test environment for cross-browser testing (Chrome 88+, Firefox 109+, Edge 88+), document setup in tests/cross-browser/setup.md
- [X] T006 Document all edge cases from spec.md as test cases in tests/baseline/edge-cases.js
- [X] T007 Establish rollback procedure documentation (how to revert to 3.5.4) in specs/001-mv3-migration/ROLLBACK.md

**Checkpoint**: Baseline established - you can now detect regressions from any MV3 changes

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for MV3 branch

- [X] T010 Create MV3 feature branch `001-mv3-migration` from master
- [X] T011 Setup parallel MV2 maintenance branch `mv2-maintenance` from master for Firefox support
- [X] T012 [P] Tag current master as `v3.5.4` (MV2 stable release baseline)
- [X] T013 [P] Create tests/ directory structure: tests/baseline/, tests/mv3/, tests/integration/, tests/cross-browser/
- [X] T014 [P] Document branching strategy in CONTRIBUTING.md (MV2 maintenance for Firefox, MV3 for Chrome/Edge)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T020 Update manifest.json: Change manifest_version from 2 to 3 in manifest.json:2
- [X] T021 Update manifest.json: Change background.scripts to background.service_worker: "js/background.js" in manifest.json:15-18
- [X] T022 Update manifest.json: Change browser_action to action in manifest.json:20-25
- [X] T023 Update manifest.json: Move host_permissions from permissions in manifest.json:10-14
- [X] T024 Update manifest.json: Add minimum Chrome version 88 in manifest.json (new field)
- [X] T025 Create migration utility module in js/migration.js with functions: createBackup(), runMigration(), checkMigrationDone(), rollbackMigration()
- [X] T026 Add service worker onInstalled event handler in js/background.js to detect upgrade from MV2 and trigger migration
- [X] T027 Add service worker wake-up logic: ensureRedirectsLoaded() function in js/background.js to load rules from chrome.storage on service worker wake
- [X] T028 [P] Add CODE ARCHAEOLOGY comments documenting all MV3 changes in js/background.js per Constitution Principle I
- [X] T029 [P] Update version to "4.0.0-beta.1" in manifest.json:3

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Seamless Extension Upgrade (Priority: P1) 🎯 MVP

**Goal**: Existing Redirector users upgrade from MV2 (v3.5.4) to MV3 (v4.0.0) and continue using all their redirect rules without any disruption or data loss.

**Independent Test**: Install MV2 with 50+ redirect rules covering all pattern types (regex, wildcard, various advanced options). Upgrade to MV3. Verify all rules work identically and data export matches pre-upgrade export byte-for-byte.

### Implementation for User Story 1

- [X] T100 [P] [US1] Implement createBackup() function in js/migration.js to backup current storage to `mv2_backup_<timestamp>` key
- [X] T101 [P] [US1] Implement checkMigrationDone() function in js/migration.js to detect if migration already completed (check for migrationState key)
- [X] T102 [US1] Implement runMigration() function in js/migration.js to backup data and set migrationState (depends on T100, T101)
- [X] T103 [US1] Implement rollbackMigration() function in js/migration.js to restore from mv2_backup key
- [X] T104 [US1] Update chrome.runtime.onInstalled listener in js/background.js to call runMigration() when reason === 'update'
- [X] T105 [US1] Add storage validation logic in js/migration.js: validateRedirects() to detect corrupted/malformed data
- [X] T106 [US1] Add error handling in runMigration() to gracefully handle corrupted data, preserve valid rules, notify user
- [X] T107 [US1] Replace chrome.webRequest blocking API with non-blocking version in js/background.js:75-100 (change listener parameters from ['blocking'] to [])
- [X] T108 [US1] Replace redirect response with chrome.tabs.update() in js/background.js:90-95 (change return {redirectUrl: ...} to chrome.tabs.update(details.tabId, {url: ...}))
- [X] T109 [US1] Update ensureRedirectsLoaded() in js/background.js to handle empty state (0 rules) without errors
- [X] T110 [US1] Add performance optimization: cache compiled RegExp objects in memory within service worker in js/background.js
- [ ] T111 [US1] Test migration with baseline-empty.json (0 rules), verify extension initializes correctly
- [ ] T112 [US1] Test migration with baseline-10-rules.json (10 rules), verify all rules preserved and functional
- [ ] T113 [US1] Test migration with baseline-100-rules.json (100+ rules), verify performance within 10ms of MV2 baseline
- [ ] T114 [US1] Test migration with corrupted data (inject malformed JSON), verify graceful error handling and user notification
- [ ] T115 [US1] Test rollback procedure: MV3 → export → install MV2 v3.5.4 → import → verify all rules work
- [ ] T116 [US1] Verify export from MV3 matches pre-upgrade export byte-for-byte (except createdBy version field)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 3 - All Existing Features Functional (Priority: P1) 🎯 MVP

**Goal**: All current Redirector features work identically in MV3: regex/wildcard patterns, capture groups ($1, $2), URL processing (decode/encode/base64), enable/disable toggles, import/export, test URL functionality, browser action icon states, and notifications.

**Independent Test**: Systematically test each feature from README examples. Verify regex capture groups, wildcard expansion, URL decode/encode, base64 decode, exclude patterns, request type filtering, disabled rule handling, historyState redirects, import/export, and all UI functions work identically.

### Implementation for User Story 3

- [X] T200 [US3] Update chrome.browserAction to chrome.action in js/popup.js:10-25 (API rename)
- [X] T201 [US3] Verify js/redirect.js pattern matching logic unchanged (NO CHANGES - code archaeology check)
- [X] T202 [US3] Verify js/redirect.js capture group substitution unchanged (NO CHANGES - code archaeology check)
- [X] T203 [US3] Verify js/redirect.js URL processing (decode/encode/base64) unchanged (NO CHANGES - code archaeology check)
- [ ] T204 [US3] Test regex redirect: `^(https?://)([a-z0-9-]*\.)m\.(.*)` → `$1$2$3` (de-mobilizer) with https://en.m.wikipedia.org/
- [ ] T205 [US3] Test wildcard redirect: `https://ad.doubleclick.net/*?http*://*` → `$2://$3` (doubleclick escaper)
- [ ] T206 [US3] Test URL decode processing: redirect with encoded characters, verify decoded capture groups
- [ ] T207 [US3] Test base64 decode processing: redirect with base64 data, verify decoded result
- [ ] T208 [US3] Test historyState redirect: YouTube Shorts → regular YouTube (chrome.webNavigation.onHistoryStateUpdated)
- [ ] T209 [US3] Test disabled rule toggle: disable rule via UI, verify no redirect occurs
- [ ] T210 [US3] Test exclude pattern: create rule with exclude, verify redirect blocked when exclude matches
- [ ] T211 [US3] Test export functionality: export rules to JSON, verify all metadata included
- [ ] T212 [US3] Test import functionality: import JSON from MV2, verify all rules recreated exactly
- [ ] T213 [US3] Test "Test" button in edit redirect UI: verify preview shows expected redirect result
- [ ] T214 [US3] Test browser action icon states: verify "on" (green) and "off" (red) badges work
- [ ] T215 [US3] Test extension disable toggle: disable extension, verify no redirects occur
- [ ] T216 [US3] Test notifications: enable notifications, trigger redirect, verify notification shows rule and URLs
- [ ] T217 [US3] Test console logging: enable logging, trigger redirect, verify console output
- [X] T218 [US3] Update dark/light mode icon logic (Chrome/Edge only) to work in MV3 service worker in js/background.js (if needed)
- [ ] T219 [US3] Test all README examples: de-mobilizer, AMP redirect, doubleclick escaper, YouTube Shorts, DDG bangs

**Checkpoint**: At this point, User Stories 1 AND 3 should both work independently

---

## Phase 5: User Story 2 - Cross-Browser Compatibility Maintained (Priority: P2)

**Goal**: Users continue using Redirector across Chrome (MV3), Firefox (MV2), Edge (MV3), Opera, and Vivaldi without compatibility issues.

**Independent Test**: Deploy MV3 build to Chrome 88+. Deploy MV2 build to Firefox 109+. Export rules from Chrome MV3, import into Firefox MV2. Verify identical behavior. Test same redirect rules produce same results across all browsers.

### Implementation for User Story 2

- [X] T300 [P] [US2] Create separate MV2 manifest for Firefox in manifest-firefox.json (copy from current manifest.json)
- [X] T301 [P] [US2] Document build process for dual manifests in BUILD.md (Firefox uses manifest-firefox.json, Chrome/Edge use manifest.json)
- [ ] T302 [US2] Verify chrome.storage API works identically in Chrome MV3 and Firefox MV2 (test in both browsers)
- [ ] T303 [US2] Test export from Chrome MV3 → import into Firefox MV2 with baseline-10-rules.json
- [ ] T304 [US2] Test export from Firefox MV2 → import into Chrome MV3 with baseline-10-rules.json
- [ ] T305 [US2] Test sync functionality: add rule in Chrome MV3, verify sync to Firefox MV2 (if both have sync enabled)
- [ ] T306 [US2] Test browser-specific request types: imageset (Firefox only), verify Chrome gracefully ignores without errors
- [ ] T307 [US2] Test identical redirect behavior: navigate same URL in Chrome MV3 and Firefox MV2, verify same result URL
- [ ] T308 [US2] Cross-browser testing on Chrome 120+ (Windows, macOS, Linux)
- [ ] T309 [US2] Cross-browser testing on Firefox 120+ (Windows, macOS, Linux) with MV2
- [ ] T310 [US2] Cross-browser testing on Edge 120+ (Windows, macOS)
- [ ] T311 [US2] Smoke test on Opera (latest) with MV3 build
- [ ] T312 [US2] Smoke test on Vivaldi (latest) with MV3 build
- [ ] T313 [US2] Verify JSON format compatibility: ensure createdBy field and version handling doesn't break import

**Checkpoint**: All user stories should now be independently functional

---

## Phase N-2: Data Migration & Backward Compatibility

**Purpose**: Ensure zero data loss and smooth rollback capability

**⚠️ CRITICAL**: Required per Constitution Principles II (User Data is Sacred) and VII (Backward Compatibility)

- [ ] T400 Implement automatic backup before data migration in js/migration.js:createBackup() (already covered in T100)
- [ ] T401 Verify no schema changes: Redirect object format identical between MV2 and MV3 in data-model.md
- [ ] T402 Verify chrome.storage keys unchanged: redirects, disabled, logging, enableNotifications, isSyncEnabled
- [ ] T403 [P] Test migration with 0 rules dataset (baseline-empty.json), verify no errors
- [ ] T404 [P] Test migration with 10 rules dataset (baseline-10-rules.json), verify all rules preserved
- [ ] T405 [P] Test migration with 100+ rules dataset (baseline-100-rules.json), verify performance acceptable
- [ ] T406 [P] Test migration with corrupted/malformed data, verify graceful error handling
- [ ] T407 Automated test: validate migrated data matches original (compare exported JSON byte-for-byte)
- [ ] T408 Test: export from MV3 → import into MV2 → verify zero data loss and identical behavior
- [ ] T409 Document migration process in specs/001-mv3-migration/MIGRATION.md

**Checkpoint**: Data migration proven safe with real user data patterns

---

## Phase N-1: Regression Testing & Risk Mitigation

**Purpose**: Verify no functionality lost, validate rollback procedures

**⚠️ CRITICAL**: Required per Constitution Principles III (Stability Over Features) and VI (Risk Assessment)

- [ ] T500 Re-run all Phase 0 baseline tests against MV3 version in tests/mv3/regression-suite.js
- [ ] T501 Compare performance: MV3 vs MV2 baseline (must be within 10ms latency, 20% memory) in tests/mv3/performance-comparison.txt
- [ ] T502 Test all README redirect examples work identically in MV3 in tests/mv3/readme-examples-mv3.js
- [ ] T503 [P] Cross-browser regression testing: Chrome MV3 (all baseline tests)
- [ ] T504 [P] Cross-browser regression testing: Firefox MV2 (verify MV2 branch unaffected)
- [ ] T505 [P] Cross-browser regression testing: Edge MV3 (all baseline tests)
- [ ] T506 Load testing: 100+ redirect rules, complex regex patterns, verify performance acceptable
- [ ] T507 Edge case testing: circular redirects (A→B→A), verify loop detection blocks after 3 redirects
- [ ] T508 Edge case testing: malformed patterns, verify graceful error handling
- [ ] T509 Edge case testing: disabled rules, verify no redirect occurs
- [ ] T510 Service worker lifecycle testing: trigger redirect, wait 35 seconds (worker sleeps), trigger again, verify cold start acceptable
- [ ] T511 Rollback drill: Time how long it takes to revert to MV2 (must be < 5 min), document in ROLLBACK.md
- [ ] T512 Document rollback triggers in ROLLBACK.md: >5% error rate, any data loss, >20% performance degradation, >10 critical bugs
- [ ] T513 Create "blast radius" documentation in specs/001-mv3-migration/RISKS.md: what breaks if service worker fails, storage fails, etc.
- [ ] T514 Memory testing: measure memory usage with 0, 10, 100 rules in MV3, compare to MV2 baseline (must be ≤20% increase)
- [ ] T515 Load testing: 1000 open tabs, trigger redirect, verify no freeze/crash in tests/mv3/load-test-1000-tabs.js

**Checkpoint**: All regressions fixed, rollback proven viable

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T600 [P] Update CHANGELOG.md with all MV3 changes and rationale (manifest changes, API migrations, service worker)
- [X] T601 [P] Create DECISIONS.md log for significant technical decisions (why not declarativeNetRequest, why hybrid approach, etc.)
- [X] T602 [P] Update README.md with MV3 migration notes, Chrome 88+ requirement, Firefox MV2 support
- [ ] T603 Code archaeology documentation: verify all CODE ARCHAEOLOGY comments added to changed files per Constitution
- [ ] T604 Security audit: review for XSS vulnerabilities in redirect URL handling in js/redirect.js
- [ ] T605 Security audit: review for injection vulnerabilities in pattern evaluation in js/redirect.js
- [ ] T606 Security audit: verify permission scope minimized in manifest.json
- [ ] T607 Performance validation: ensure no degradation vs MV2 baseline (re-run T501)
- [ ] T608 Create beta release notes in specs/001-mv3-migration/RELEASE-NOTES-4.0.0-beta.1.md
- [ ] T609 Update privacy.md if any privacy implications from MV3 changes
- [ ] T610 Create user communication plan for beta release (GitHub issue, Chrome Web Store description update)
- [ ] T611 Tag beta release: `git tag v4.0.0-beta.1`
- [ ] T612 Build release ZIP: `zip -r redirector-4.0.0-beta.1.zip manifest.json js/ css/ images/ popup.html redirector.html privacy.md -x "*.DS_Store"`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Pre-Migration Baseline)**: No dependencies - MUST start first (Constitution requirement)
- **Phase 1 (Setup)**: Depends on Phase 0 completion - establishes branch structure
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational (Phase 2) completion
  - **Phase 3 (US1 - P1)** can proceed after Phase 2
  - **Phase 4 (US3 - P1)** can proceed after Phase 2 (parallel with Phase 3 if staffed)
  - **Phase 5 (US2 - P2)** can proceed after Phase 2 (parallel with Phase 3/4 if staffed)
- **Phase N-2 (Data Migration)**: Depends on Phase 3 (US1) completion - validates migration
- **Phase N-1 (Regression Testing)**: Depends on all user story phases completion - validates entire migration
- **Phase N (Polish)**: Depends on Phase N-1 completion - final release preparation

### User Story Dependencies

- **User Story 1 (P1 - US1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1 - US3)**: Can start after Foundational (Phase 2) - Independent of US1 but should verify pattern matching works
- **User Story 2 (P2 - US2)**: Can start after Foundational (Phase 2) - May integrate with US1/US3 for testing but independently testable

### Critical Path

1. **Phase 0** (baseline) → **Phase 1** (setup) → **Phase 2** (foundational) → **Phase 3** (US1 migration) → **Phase N-2** (data validation) → **Phase N-1** (regression testing) → **Phase N** (polish)

The critical path prioritizes US1 (Seamless Upgrade) since it's the core migration scenario. US3 (Features) and US2 (Cross-browser) can run in parallel after Phase 2 if team capacity allows.

### Within Each User Story

- **US1 (Phase 3)**:
  - T100, T101 (parallel) → T102 → T103
  - T104 depends on T102
  - T105, T106 can run after T100
  - T107, T108 (API changes) can run in parallel after Phase 2
  - T109, T110 (optimizations) can run in parallel after T107, T108
  - T111-T116 (tests) must run after implementation (T100-T110)

- **US3 (Phase 4)**:
  - T200 (popup API) independent
  - T201-T203 (verification) can run in parallel
  - T204-T219 (feature tests) can run in any order after implementation complete

- **US2 (Phase 5)**:
  - T300, T301 (manifest/docs) can run in parallel
  - T302-T313 (cross-browser tests) can run in any order after T300, T301

### Parallel Opportunities

- **Phase 0**: T002, T003, T004 can run in parallel (different baseline datasets)
- **Phase 1**: T012, T013, T014 can run in parallel (branch setup, docs)
- **Phase 2**: T028, T029 can run in parallel with other Phase 2 tasks (documentation)
- **Phase 3 (US1)**: T100 and T101 can run in parallel (different functions in migration.js)
- **Phase 3 (US1)**: T111, T112, T113, T114 can run in parallel (independent test datasets)
- **Phase 4 (US3)**: T201, T202, T203 can run in parallel (verification tasks)
- **Phase 4 (US3)**: T204-T219 can run in any order in parallel (independent feature tests)
- **Phase 5 (US2)**: T300, T301 can run in parallel (manifest and docs)
- **Phase 5 (US2)**: T303, T304, T305, T306, T307 can run in parallel (different cross-browser tests)
- **Phase 5 (US2)**: T308, T309, T310, T311, T312 can run in parallel (different browser/OS combos)
- **Phase N-2**: T403, T404, T405, T406 can run in parallel (different test datasets)
- **Phase N-1**: T503, T504, T505 can run in parallel (different browsers)
- **Phase N**: T600, T601, T602, T603 can run in parallel (different documentation files)

**User Stories in Parallel**: After Phase 2 completion, Phase 3 (US1), Phase 4 (US3), and Phase 5 (US2) can be worked on in parallel by different team members if capacity allows.

---

## Parallel Example: User Story 1 (Phase 3)

```bash
# Launch parallel migration module functions (different files, no dependencies):
Task T100: "Implement createBackup() function in js/migration.js"
Task T101: "Implement checkMigrationDone() function in js/migration.js"

# After T100, T101 complete, launch sequential dependent task:
Task T102: "Implement runMigration() function in js/migration.js (depends on T100, T101)"

# Launch parallel API changes (different sections of background.js):
Task T107: "Replace chrome.webRequest blocking API with non-blocking version in js/background.js:75-100"
Task T108: "Replace redirect response with chrome.tabs.update() in js/background.js:90-95"

# Launch parallel tests (independent datasets):
Task T111: "Test migration with baseline-empty.json (0 rules)"
Task T112: "Test migration with baseline-10-rules.json (10 rules)"
Task T113: "Test migration with baseline-100-rules.json (100+ rules)"
Task T114: "Test migration with corrupted data"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 3)

1. Complete Phase 0: Pre-Migration Baseline (MANDATORY - establish safety net)
2. Complete Phase 1: Setup (branch structure)
3. Complete Phase 2: Foundational (manifest.json, service worker basics) - BLOCKS all stories
4. Complete Phase 3: User Story 1 (migration logic, data preservation)
5. Complete Phase 4: User Story 3 (verify all features work)
6. **STOP and VALIDATE**: Test US1 + US3 independently with real user data
7. Deploy beta to 1% users

### Incremental Delivery

1. **Week 1-2**: Phase 0 (baseline) + Phase 1 (setup) → Safety net established
2. **Week 3-4**: Phase 2 (foundational) → Foundation ready
3. **Week 5-6**: Phase 3 (US1) → Migration working, test independently
4. **Week 7-8**: Phase 4 (US3) → All features working, test independently
5. **Week 9**: Phase 5 (US2) → Cross-browser validated, test independently
6. **Week 10**: Phase N-2, N-1 (data validation, regression testing) → All tests pass
7. **Week 11**: Phase N (polish) → Beta release ready
8. **Week 12-13**: Beta testing (2 weeks minimum, 100+ users, zero critical bugs)
9. **Week 14+**: Gradual stable rollout (1%→10%→25%→50%→100% over 4 weeks)

### Parallel Team Strategy

With multiple developers:

1. **All team**: Complete Phase 0 + Phase 1 together (baseline + setup)
2. **All team**: Complete Phase 2 together (foundational - blocks everything)
3. Once Phase 2 done:
   - **Developer A**: Phase 3 (US1 - Seamless Upgrade)
   - **Developer B**: Phase 4 (US3 - All Features Functional)
   - **Developer C**: Phase 5 (US2 - Cross-Browser Compatibility)
4. **All team**: Phase N-2, N-1, N (data validation, regression testing, polish)
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3)
- Each user story should be independently completable and testable
- Phase 0 is MANDATORY before any code changes (Constitution Principle V)
- Stop at any checkpoint to validate story independently
- Commit after each task or logical group
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Constitution compliance: All 7 principles verified in plan.md Constitution Check
- Rollback plan: Tested and documented in Phase 0, validated in Phase N-1
- Data preservation: Zero data loss proven through automated testing (T407, T408)
