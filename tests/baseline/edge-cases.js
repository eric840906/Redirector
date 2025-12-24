/**
 * Edge Cases Test Suite
 *
 * Purpose: Document and validate all edge cases from spec.md
 * Baseline: MV2 v3.5.4
 * Date: 2025-12-22
 *
 * Constitution Principle V: "Test Obsessively"
 *
 * Edge cases must pass in both MV2 and MV3 to ensure regression-free migration.
 */

const EDGE_CASES = {

  /**
   * Category 1: Data Migration & Backward Compatibility
   */
  dataMigration: {

    /**
     * EC-001: Empty Rules (0 rules)
     * User with no configured rules upgrades to MV3
     */
    emptyRules: {
      description: "Extension initializes correctly with 0 rules",
      dataset: "baseline-empty.json",
      testProcedure: [
        "1. Load extension with 0 rules",
        "2. Verify extension icon shows",
        "3. Open settings page",
        "4. Verify empty rule list displayed",
        "5. Add new rule",
        "6. Verify rule saves correctly"
      ],
      expectedBehavior: "No migration errors, empty state handled gracefully, can add new rules",
      successCriteria: "Extension functional, no console errors, can create rules"
    },

    /**
     * EC-002: Large Rule Sets (100+ rules)
     */
    largeRuleSets: {
      description: "Extension handles 150 redirect rules approaching storage limits",
      dataset: "baseline-100-rules.json",
      testProcedure: [
        "1. Import 100+ rule dataset",
        "2. Verify all rules migrate successfully",
        "3. Test redirect performance (p95 < 100ms)",
        "4. Check storage quota usage",
        "5. Test export (should complete < 5 seconds)",
        "6. Verify no memory leaks"
      ],
      expectedBehavior: "All rules work, performance acceptable, no quota errors",
      successCriteria: "100% rule preservation, latency within targets (SC-002), no crashes"
    },

    /**
     * EC-003: Corrupted Data
     */
    corruptedData: {
      description: "Malformed JSON in storage due to manual editing or corruption",
      testDataGeneration: `
        // Inject corrupted data into storage
        chrome.storage.local.set({
          redirects: [
            { description: "Valid rule", includePattern: ".*", redirectUrl: "$1" },
            { description: "Missing required field" }, // Corrupted - no includePattern
            "not an object", // Corrupted - wrong type
            null, // Corrupted - null value
            { description: "Valid rule 2", includePattern: ".*", redirectUrl: "$2" }
          ]
        });
      `,
      testProcedure: [
        "1. Inject corrupted data via console",
        "2. Reload extension",
        "3. Verify migration detects corruption",
        "4. Check error logs",
        "5. Verify valid rules preserved",
        "6. Verify user notified of corruption"
      ],
      expectedBehavior: "Preserve valid rules, log errors, notify user with actionable guidance",
      successCriteria: "No crashes, valid rules work, corruption logged, user informed"
    },

    /**
     * EC-004: Mid-Migration Failure
     */
    midMigrationFailure: {
      description: "Browser crashes or extension updates interrupted during data migration",
      testProcedure: [
        "1. Start migration from MV2 to MV3",
        "2. Force-kill browser during migration (simulate crash)",
        "3. Restart browser",
        "4. Verify extension detects incomplete migration",
        "5. Verify rollback to MV2 data format",
        "6. Verify user prompted to retry or report issue"
      ],
      expectedBehavior: "Detect incomplete migration, roll back to MV2 data, prompt user",
      successCriteria: "No data loss, automatic rollback works, user can retry migration"
    },

    /**
     * EC-005: MV3 → MV2 Rollback
     */
    mv3ToMv2Rollback: {
      description: "User experiences issue with MV3, exports data, downgrades to MV2 v3.5.4",
      testProcedure: [
        "1. Load MV3 with 50 rules",
        "2. Export → Save as mv3-export.json",
        "3. Uninstall MV3",
        "4. Install MV2 v3.5.4",
        "5. Import mv3-export.json",
        "6. Verify all rules work identically to MV3"
      ],
      expectedBehavior: "Import succeeds, all rules work, no data loss",
      successCriteria: "100% data preservation, identical behavior (SC-004, SC-011)"
    },

    /**
     * EC-006: Export/Import Between MV2 and MV3
     */
    crossVersionExportImport: {
      description: "Export from MV3, import into MV2 (different browser)",
      testProcedure: [
        "1. Export from Chrome MV3",
        "2. Import into Firefox MV2",
        "3. Verify JSON format compatible",
        "4. Verify no version-specific fields break import",
        "5. Verify all rules recreate correctly"
      ],
      expectedBehavior: "Cross-version import succeeds, rules work identically",
      successCriteria: "Zero data loss, format compatibility maintained (SC-008)"
    }
  },

  /**
   * Category 2: Cross-Browser & Performance
   */
  crossBrowserPerformance: {

    /**
     * EC-007: Browser-Specific Differences
     */
    browserSpecificRequestTypes: {
      description: "Redirect rule uses 'imageset' request type (Firefox only)",
      testRule: {
        description: "Firefox imageset test",
        includePattern: "^https://example\\.com/image/.*",
        redirectUrl: "https://cdn.example.com/$1",
        appliesTo: ["imageset"] // Firefox-specific
      },
      testProcedure: [
        "1. Import rule with imageset request type",
        "2. Load in Firefox → Verify works",
        "3. Load in Chrome → Verify ignores gracefully (no errors)",
        "4. Verify Chrome continues working for other rules"
      ],
      expectedBehavior: "Firefox uses imageset, Chrome ignores gracefully without errors",
      successCriteria: "No crashes, Chrome logs warning (acceptable), Firefox works"
    },

    /**
     * EC-008: Complex Regex Performance
     */
    complexRegexPerformance: {
      description: "Redirect with regex pattern taking 500ms to evaluate",
      testPattern: "^(https?://)([a-z0-9-]*\\.)(m|mobile|www|wap|touch)\\.(wikipedia|google|amazon|facebook|twitter|reddit|youtube)\\.(com|org|net|co\\.uk|de|fr|jp|cn|in|br|ru)(.*)",
      testUrl: "https://m.wikipedia.org/wiki/Test",
      testProcedure: [
        "1. Create rule with complex regex",
        "2. Navigate to test URL",
        "3. Measure evaluation time (use Performance API)",
        "4. If > 100ms, verify timeout or async handling",
        "5. Verify browser doesn't freeze",
        "6. Check console for slow pattern warning"
      ],
      expectedBehavior: "System detects slow pattern, logs warning, does not block browser",
      successCriteria: "No freeze, timeout works, user notified of slow pattern (SC-033)"
    },

    /**
     * EC-009: Conflicting Rules
     */
    conflictingRules: {
      description: "Two rules with overlapping include patterns",
      testRules: [
        {
          description: "Rule 1: Catch-all for example.com",
          includePattern: "^https://example\\.com/.*",
          redirectUrl: "https://dest1.com/$1"
        },
        {
          description: "Rule 2: Specific path on example.com",
          includePattern: "^https://example\\.com/specific/.*",
          redirectUrl: "https://dest2.com/$1"
        }
      ],
      testUrl: "https://example.com/specific/page",
      testProcedure: [
        "1. Add both rules (Rule 1 first, then Rule 2)",
        "2. Navigate to https://example.com/specific/page",
        "3. Verify Rule 1 wins (first matching rule)",
        "4. Reorder: Move Rule 2 above Rule 1",
        "5. Navigate again",
        "6. Verify Rule 2 wins (now first)"
      ],
      expectedBehavior: "First matching rule wins (consistent with MV2 behavior)",
      successCriteria: "MV3 behavior identical to MV2, rule order matters"
    },

    /**
     * EC-010: 1000+ Open Tabs
     */
    thousandTabsLoadTest: {
      description: "User has 1000 tabs open, navigates URL triggering redirect",
      testProcedure: [
        "1. Open 1000 tabs (script: for(let i=0;i<1000;i++) window.open('about:blank'))",
        "2. Import de-mobilizer rule",
        "3. In one tab, navigate to https://en.m.wikipedia.org/",
        "4. Verify redirect completes",
        "5. Monitor memory usage",
        "6. Verify no freeze or crash"
      ],
      expectedBehavior: "Redirect completes within acceptable latency, no freeze, no crash",
      successCriteria: "System handles 1000 tabs without issues (SC-014)"
    },

    /**
     * EC-011: Redirect Loops
     */
    redirectLoops: {
      description: "User creates redirect A→B and B→A (circular redirect)",
      testRules: [
        {
          description: "Redirect A to B",
          includePattern: "^https://site-a\\.com/.*",
          redirectUrl: "https://site-b.com/$1"
        },
        {
          description: "Redirect B to A",
          includePattern: "^https://site-b\\.com/.*",
          redirectUrl: "https://site-a.com/$1"
        }
      ],
      testUrl: "https://site-a.com/page",
      testProcedure: [
        "1. Add both rules",
        "2. Navigate to https://site-a.com/page",
        "3. Verify loop detection triggers",
        "4. Verify blocked after 3 redirects within 3 seconds",
        "5. Check console for loop detection message",
        "6. Verify behavior matches MV2"
      ],
      expectedBehavior: "Loop detection prevents infinite redirects (threshold: 3 within 3 seconds)",
      successCriteria: "Blocked after 3 attempts, user notified, matches MV2 (SC-013)"
    }
  },

  /**
   * Category 3: User Workflow
   */
  userWorkflow: {

    /**
     * EC-012: Update During Active Redirect
     */
    updateDuringRedirect: {
      description: "User navigates to URL triggering redirect while extension updates from MV2 to MV3",
      testProcedure: [
        "1. Load MV2 with de-mobilizer rule",
        "2. Start navigation to https://en.m.wikipedia.org/",
        "3. During navigation, trigger extension update to MV3",
        "4. Observe behavior: in-flight request completes or fails gracefully",
        "5. Next request should use MV3 code",
        "6. Verify no browser hang or crash"
      ],
      expectedBehavior: "In-flight request completes or fails gracefully, next request uses MV3",
      successCriteria: "No crash, no hang, next redirect works with MV3"
    },

    /**
     * EC-013: Editing Rules During Migration
     */
    editingDuringMigration: {
      description: "User opens settings page during first-launch migration",
      testProcedure: [
        "1. Trigger MV2→MV3 update",
        "2. Immediately open settings page",
        "3. Verify UI shows loading state or blocks interaction",
        "4. Wait for migration to complete",
        "5. Verify settings page then loads correctly",
        "6. Verify no data race conditions or corruption"
      ],
      expectedBehavior: "UI shows loading state, blocks interaction until migration completes",
      successCriteria: "No data corruption, clean migration, UI responsive after completion"
    },

    /**
     * EC-014: Migration Progress Communication
     */
    migrationProgressCommunication: {
      description: "User upgrades to MV3, migration takes 5 seconds (large rule set)",
      testProcedure: [
        "1. Load MV2 with 100+ rules",
        "2. Upgrade to MV3",
        "3. Observe migration progress indicator",
        "4. Verify completion notification",
        "5. If errors, verify recovery actions provided"
      ],
      expectedBehavior: "Clear progress indicator, completion notification, error recovery actions",
      successCriteria: "User informed of progress, completion status, any errors with guidance"
    },

    /**
     * EC-015: Service Worker Lifecycle
     */
    serviceWorkerLifecycle: {
      description: "MV3 service worker shuts down after inactivity (browser behavior)",
      testProcedure: [
        "1. Load MV3 with rules",
        "2. Trigger redirect → Record 'warm start' time",
        "3. Wait 35 seconds (service worker should shut down)",
        "4. Trigger same redirect → Record 'cold start' time",
        "5. Verify rules load from storage on cold start",
        "6. Verify redirect proceeds normally"
      ],
      expectedBehavior: "Service worker wakes up, loads rules from storage, redirect works",
      successCriteria: "Cold start ~50-100ms slower (acceptable), redirect completes (SC-007)"
    },

    /**
     * EC-016: Storage Sync Conflicts
     */
    storageSyncConflicts: {
      description: "User has sync enabled, modifies rules on Chrome MV3 while Firefox MV2 offline",
      testProcedure: [
        "1. Enable sync on Chrome MV3 and Firefox MV2",
        "2. Take Firefox offline",
        "3. Modify rules on Chrome (add/edit/delete)",
        "4. Bring Firefox back online",
        "5. Observe sync conflict resolution",
        "6. Verify last-write-wins behavior",
        "7. Verify no data corruption"
      ],
      expectedBehavior: "Sync merge conflict resolved (last-write-wins), no data corruption",
      successCriteria: "User can export/import if needed, sync doesn't corrupt data"
    }
  }
};

/**
 * Test Runner Instructions
 *
 * For MV2 Baseline:
 * 1. Load Redirector MV2 v3.5.4
 * 2. Execute each edge case test procedure
 * 3. Record results: PASS / FAIL / NOTES
 * 4. Document any deviations from expected behavior
 *
 * For MV3 Validation:
 * 1. Load Redirector MV3 v4.0.0-beta.1
 * 2. Execute same edge case test procedures
 * 3. Compare results to MV2 baseline
 * 4. Verify behavior is IDENTICAL (or acceptably different with justification)
 *
 * Success Criteria:
 * ✅ All edge cases handled gracefully
 * ✅ MV3 behavior matches MV2 (or documented difference acceptable)
 * ✅ No crashes, no data loss, no undefined behavior
 */

/**
 * Expected Results Template
 *
 * Date Tested: [YYYY-MM-DD]
 * Version: MV2 v3.5.4 / MV3 v4.0.0-beta.1
 * Browser: Chrome [VERSION]
 *
 * Edge Case Results:
 *
 * Data Migration:
 * - EC-001 (Empty Rules): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-002 (Large Rule Sets): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-003 (Corrupted Data): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-004 (Mid-Migration Failure): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-005 (MV3→MV2 Rollback): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-006 (Cross-Version Export/Import): [ ] PASS / [ ] FAIL - Notes: _______
 *
 * Cross-Browser & Performance:
 * - EC-007 (Browser-Specific): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-008 (Complex Regex): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-009 (Conflicting Rules): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-010 (1000 Tabs): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-011 (Redirect Loops): [ ] PASS / [ ] FAIL - Notes: _______
 *
 * User Workflow:
 * - EC-012 (Update During Redirect): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-013 (Editing During Migration): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-014 (Migration Progress): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-015 (Service Worker Lifecycle): [ ] PASS / [ ] FAIL - Notes: _______
 * - EC-016 (Storage Sync Conflicts): [ ] PASS / [ ] FAIL - Notes: _______
 *
 * Overall: [ ] ALL PASS (baseline established) / [ ] FAILURES (investigate)
 */

/**
 * Export for automated testing (future)
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EDGE_CASES;
}
