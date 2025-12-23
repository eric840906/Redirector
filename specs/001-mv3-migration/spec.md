# Feature Specification: Manifest V3 Migration

**Feature Branch**: `001-mv3-migration`
**Created**: 2025-12-22
**Status**: Draft
**Input**: User description: "Migrate Redirector from Manifest V2 to Manifest V3 for Chrome compatibility while preserving all existing functionality and ensuring zero user data loss"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seamless Extension Upgrade (Priority: P1)

Existing Redirector users upgrade from MV2 (v3.5.4) to MV3 (v4.0.0) and continue using all their redirect rules without any disruption or data loss.

**Why this priority**: This is the core migration scenario. Every user will experience this. If migration fails or loses data, the entire MV3 effort fails. This is non-negotiable per Constitution Principle II (User Data is Sacred).

**Independent Test**: Install MV2 with 50+ redirect rules covering all pattern types (regex, wildcard, various advanced options). Upgrade to MV3. Verify all rules work identically and data export matches pre-upgrade export byte-for-byte.

**Acceptance Scenarios**:

1. **Given** user has Redirector MV2 v3.5.4 with 50 redirect rules (mix of regex/wildcard, enabled/disabled), **When** extension auto-updates to MV3 v4.0.0, **Then** all 50 rules remain intact, enabled/disabled states preserved, and redirects continue functioning identically
2. **Given** user has MV2 with empty redirect list (0 rules), **When** extension updates to MV3, **Then** extension works correctly with empty state and user can add new rules normally
3. **Given** user has MV2 with 100+ redirect rules and advanced options (URL decode, base64, historyState), **When** extension updates to MV3, **Then** all advanced options continue working and performance remains within 10ms of MV2 baseline
4. **Given** user has MV2 with corrupted/malformed data in storage, **When** extension updates to MV3, **Then** migration gracefully handles errors, preserves valid rules, and notifies user of any issues
5. **Given** user upgrades to MV3 and encounters issues, **When** user exports data and reinstalls MV2 v3.5.4, **Then** user can import data and all rules work exactly as before upgrade

---

### User Story 2 - Cross-Browser Compatibility Maintained (Priority: P2)

Users continue using Redirector across Chrome (MV3), Firefox (MV2), Edge (MV3), Opera, and Vivaldi without compatibility issues.

**Why this priority**: Redirector has a diverse user base across browsers. Breaking Firefox (which still supports MV2) or other browsers would alienate users. This is required per Constitution Principle VII (Backward Compatibility).

**Independent Test**: Deploy MV3 build to Chrome 88+. Deploy MV2 build to Firefox 109+. Export rules from Chrome MV3, import into Firefox MV2. Verify identical behavior. Test same redirect rules produce same results across all browsers.

**Acceptance Scenarios**:

1. **Given** user has Redirector MV3 on Chrome 120+, **When** user exports redirect rules and imports into Firefox 109+ (MV2), **Then** all rules work identically in Firefox without modification
2. **Given** user has Redirector running on Chrome, Firefox, and Edge simultaneously with synced rules, **When** user adds/modifies a rule on Chrome MV3, **Then** changes propagate correctly to Firefox MV2 and Edge MV3
3. **Given** user has browser-specific redirect rules (e.g., Firefox-only history state rules), **When** user switches between browsers, **Then** rules gracefully handle browser differences without errors
4. **Given** user navigates a URL matching redirect rules on Chrome MV3, **When** same URL is navigated on Firefox MV2, **Then** redirect behavior and result URL are identical

---

### User Story 3 - All Existing Features Functional (Priority: P1)

All current Redirector features work identically in MV3: regex/wildcard patterns, capture groups ($1, $2), URL processing (decode/encode/base64), enable/disable toggles, import/export, test URL functionality, browser action icon states, and notifications.

**Why this priority**: Users rely on specific features. Removing or breaking any feature violates Constitution Principle III (Stability Over Features). This is the "do no harm" requirement.

**Independent Test**: Systematically test each feature from README examples. Verify regex capture groups, wildcard expansion, URL decode/encode, base64 decode, exclude patterns, request type filtering, disabled rule handling, historyState redirects, import/export, and all UI functions work identically.

**Acceptance Scenarios**:

1. **Given** user creates regex redirect `^(https?://)([a-z0-9-]*\.)m\.(.*)`  → `$1$2$3` (de-mobilizer pattern), **When** user navigates to `https://en.m.wikipedia.org/`, **Then** user is redirected to `https://en.wikipedia.org/` with capture groups working correctly
2. **Given** user creates wildcard redirect `https://ad.doubleclick.net/*?http*://*` → `$2://$3` (doubleclick escaper), **When** user encounters doubleclick tracking URL, **Then** redirect extracts and redirects to final destination
3. **Given** user enables URL decode processing on redirect with encoded characters, **When** redirect matches and processes URL, **Then** decoded values correctly populate capture groups
4. **Given** user creates redirect with base64 decode processing, **When** redirect matches URL with base64 data, **Then** decoded result correctly replaces capture group reference
5. **Given** user has redirect rule with "history" request type (YouTube Shorts → regular YouTube), **When** user navigates via browser history state changes, **Then** redirect still triggers without full page reload
6. **Given** user disables a redirect rule via toggle, **When** URLs matching that pattern are navigated, **Then** no redirect occurs until rule is re-enabled
7. **Given** user excludes specific patterns via exclude field, **When** URL matches include pattern but also matches exclude pattern, **Then** redirect does not occur
8. **Given** user exports redirect rules as JSON, **When** user imports that JSON file on different browser/profile, **Then** all rules recreate exactly with all settings intact
9. **Given** user clicks "Test" on a redirect rule, **When** test URL matches include pattern, **Then** UI shows expected redirect result before saving rule
10. **Given** Redirector is disabled via extension toggle, **When** user navigates URLs that would normally redirect, **Then** no redirects occur and browser action icon shows "off" badge

---

### Edge Cases

**Data Migration & Backward Compatibility:**

- **Empty Rules (0 rules)**: User with no configured rules upgrades to MV3. Extension initializes correctly, shows empty rule list, allows adding new rules. No migration errors occur.
- **Large Rule Sets (100+ rules)**: User with 150 redirect rules (approaching storage limits) upgrades to MV3. All rules migrate successfully, performance remains acceptable (<100ms redirect latency p95), no storage quota errors.
- **Corrupted Data**: User has malformed JSON in chrome.storage due to manual editing or corruption. Migration detects corruption, preserves valid rules, creates backup, logs errors, notifies user with actionable guidance.
- **Mid-Migration Failure**: Browser crashes or extension updates interrupted during data migration. Next launch detects incomplete migration, rolls back to MV2 data format, prompts user to retry or report issue.
- **MV3 → MV2 Rollback**: User experiences issue with MV3, exports data, downgrades to MV2 v3.5.4. Import into MV2 succeeds without data loss, all rules work identically.
- **Export/Import Between MV2 and MV3**: User exports from MV3, imports into MV2 (different browser). JSON format remains compatible, no version-specific fields break import, all rules recreate correctly.

**Cross-Browser & Performance:**

- **Browser-Specific Differences**: Redirect rule uses `imageset` request type (Firefox only). Chrome MV3 ignores unsupported types gracefully without errors. Rule continues working in Firefox MV2.
- **Complex Regex Performance**: User has redirect with regex pattern taking 500ms to evaluate. System detects slow pattern, logs warning, does not block browser (timeout or async handling). User notified of slow pattern.
- **Conflicting Rules**: User has two rules with overlapping include patterns. First matching rule wins (consistent with MV2 behavior). Behavior identical in MV3.
- **1000+ Open Tabs**: User has 1000 tabs open, navigates URL triggering redirect. System handles without freezing or crashing, redirect completes within acceptable latency, no memory leak.
- **Redirect Loops**: User creates redirect A→B and B→A (circular redirect). Loop detection (existing threshold mechanism) prevents infinite redirects, blocks after 3 redirects within 3 seconds, matches MV2 behavior.

**User Workflow:**

- **Update During Active Redirect**: User navigates to URL triggering redirect while extension updates from MV2 to MV3. In-flight request completes or fails gracefully, next request uses MV3 code, no browser hang or crash.
- **Editing Rules During Migration**: User opens settings page during first-launch migration. UI shows loading state or blocks interaction until migration completes, prevents data race conditions.
- **Migration Progress Communication**: User upgrades to MV3, migration takes 5 seconds (large rule set). Extension shows clear progress indicator, completion notification, any errors with recovery actions.
- **Service Worker Lifecycle**: MV3 service worker shuts down after inactivity (browser behavior). Next redirect request wakes service worker, rules load from storage, redirect proceeds normally without user-visible delay.
- **Storage Sync Conflicts**: User has sync enabled, modifies rules on Chrome MV3 while Firefox MV2 offline. When Firefox comes online, sync merge conflict is resolved (last-write-wins), no data corruption, user can export/import if needed.

---

## Requirements *(mandatory)*

### Functional Requirements

**Core Migration:**

- **FR-001**: System MUST preserve all user redirect rules during migration from MV2 to MV3 with zero data loss
- **FR-002**: System MUST automatically backup user data before migration begins
- **FR-003**: System MUST detect incomplete or failed migrations on startup and provide rollback mechanism
- **FR-004**: System MUST maintain data format compatibility allowing export from MV3 and import into MV2 without loss

**API Migration:**

- **FR-005**: System MUST replace webRequest blocking API with equivalent MV3 mechanism while preserving all redirect functionality
- **FR-006**: System MUST replace persistent background page with service worker that handles all redirect logic
- **FR-007**: System MUST replace chrome.browserAction with chrome.action API maintaining all icon, badge, and popup functionality
- **FR-008**: System MUST ensure chrome.storage access works correctly in service worker context (no localStorage dependencies)

**Pattern Handling:**

- **FR-009**: System MUST support regex patterns with capture groups ($1, $2, $3...) identically to MV2
- **FR-010**: System MUST support wildcard patterns with asterisk (*) expansion identically to MV2
- **FR-011**: System MUST handle include and exclude patterns with identical matching logic to MV2
- **FR-012**: System MUST process matches with URL decode, URL encode, double URL decode, and base64 decode options identically to MV2
- **FR-013**: System MUST handle patterns that exceed declarativeNetRequest limitations (regex length, complexity)

**Request Type Filtering:**

- **FR-014**: System MUST support filtering redirects by request type (main_frame, sub_frame, stylesheet, script, image, media, xmlhttprequest, history, other)
- **FR-015**: System MUST handle browser-specific request types (e.g., imageset in Firefox) gracefully without errors
- **FR-016**: System MUST support historyState redirects for SPA navigation (YouTube Shorts, Facebook, Twitter URL changes)

**Rule Management:**

- **FR-017**: System MUST allow users to enable/disable individual redirect rules with immediate effect
- **FR-018**: System MUST preserve disabled state of rules across extension restarts and upgrades
- **FR-019**: System MUST prevent redirect loops by tracking recently redirected URLs (threshold: 3 redirects within 3 seconds)
- **FR-020**: System MUST evaluate rules in order and apply first matching rule (consistent with MV2)

**Import/Export:**

- **FR-021**: System MUST export all redirect rules to JSON file including all metadata (description, example, patterns, options, enabled state)
- **FR-022**: System MUST import redirect rules from JSON file with validation and duplicate detection
- **FR-023**: System MUST maintain JSON format compatibility between MV2 and MV3 versions
- **FR-024**: System MUST handle import of files created by MV2 into MV3 and vice versa

**UI and Settings:**

- **FR-025**: System MUST provide popup UI with enable/disable toggle, settings link, logging toggle, notifications toggle
- **FR-026**: System MUST show browser action badge indicating "on" (green) or "off" (red) state
- **FR-027**: System MUST update icon for dark/light mode (Chrome/Edge only) matching MV2 behavior
- **FR-028**: System MUST provide "Test" functionality allowing users to validate redirect rules before saving
- **FR-029**: System MUST show example result or validation errors when testing redirect rules
- **FR-030**: System MUST provide settings page for creating, editing, deleting, reordering, and organizing redirect rules

**Performance and Safety:**

- **FR-031**: System MUST complete redirects within acceptable latency (no more than 10ms slower than MV2 baseline)
- **FR-032**: System MUST handle 100+ redirect rules without performance degradation
- **FR-033**: System MUST protect against regex DoS by validating patterns and timing out slow evaluations
- **FR-034**: System MUST handle service worker lifecycle (sleep/wake) transparently to user

**Cross-Browser Support:**

- **FR-035**: System MUST maintain MV2 version for Firefox 109+ users who cannot use MV3
- **FR-036**: System MUST support Chrome 88+, Edge 88+ with MV3
- **FR-037**: System MUST maintain Opera and Vivaldi compatibility
- **FR-038**: System MUST handle browser-specific API differences gracefully (feature detection, fallbacks)

**Notifications and Logging:**

- **FR-039**: System MUST support optional redirect notifications showing which rule triggered and original→redirected URL
- **FR-040**: System MUST support console logging toggle for debugging redirect behavior
- **FR-041**: System MUST log errors and warnings to help users troubleshoot issues

**Storage Sync:**

- **FR-042**: System MUST support optional chrome.storage.sync for syncing redirect rules across devices
- **FR-043**: System MUST handle storage.sync quota limits gracefully, warning user when approaching limits
- **FR-044**: System MUST allow toggling between local and sync storage with data migration

### Key Entities

- **Redirect Rule**: Represents a single redirect configuration with include pattern, exclude pattern, redirect URL, pattern type (regex/wildcard), processing options (URL decode/encode/base64), request types, enabled state, description, example URL/result, and metadata

- **Pattern**: Include or exclude pattern using regex or wildcard syntax, compiled into JavaScript RegExp for matching against URLs

- **Match Result**: Result of matching a URL against redirect rule, containing match status, redirect destination URL, capture group values, and disabled/excluded states

- **Storage Data**: Persistent data in chrome.storage containing array of redirect rules, global settings (disabled state, logging, notifications, sync enabled), and migration metadata

- **Migration State**: Tracking data for MV2→MV3 migration including backup timestamp, migration version, completion status, and rollback information

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users upgrading from MV2 to MV3 experience zero data loss (all redirect rules preserved with identical behavior)
- **SC-002**: Users with 100+ redirect rules experience no more than 10ms additional latency compared to MV2 baseline (measured at p95)
- **SC-003**: All redirect patterns from README examples work identically in MV3 (de-mobilizer, AMP redirect, doubleclick escaper, YouTube Shorts, DDG bangs)
- **SC-004**: Users can export rules from MV3 and import into MV2 with 100% fidelity (rollback capability proven)
- **SC-005**: Extension passes cross-browser testing on Chrome 120+, Firefox 120+, Edge 120+ without errors
- **SC-006**: Zero critical bugs reported in beta testing (2 week period with 100+ users)
- **SC-007**: Service worker handles sleep/wake cycles without user-visible delays or failures (tested with 100+ redirect scenarios)
- **SC-008**: Import/export functionality maintains 100% compatibility between MV2 and MV3 JSON formats
- **SC-009**: All advanced options (URL decode, base64, historyState) work identically to MV2 in user testing
- **SC-010**: Migration completes within 5 seconds for users with 200 redirect rules (99th percentile)
- **SC-011**: Users can successfully roll back to MV2 after trying MV3, with full data restoration proven in testing
- **SC-012**: Extension memory usage increases by no more than 20% compared to MV2 baseline for equivalent workloads
- **SC-013**: Redirect loop detection prevents infinite redirects in 100% of test cases (threshold: 3 within 3 seconds)
- **SC-014**: Extension handles 1000 open tabs without freezing or crashing when redirect is triggered
- **SC-015**: Users report identical redirect behavior between MV3 and MV2 in feedback surveys (qualitative validation)

---

## Assumptions

**Technical Assumptions:**

1. **declarativeNetRequest Limitations**: We assume declarativeNetRequest API may not support all advanced regex patterns and capture group transformations. Fallback: Hybrid approach using declarativeNetRequest for simple rules and chrome.tabs.update for complex patterns that require JavaScript evaluation.

2. **Service Worker Persistence**: We assume service workers will shut down after inactivity (Chrome behavior). Mitigation: Design stateless architecture loading rules from storage on each wake, use chrome.alarms for periodic keep-alive if needed.

3. **Storage Compatibility**: We assume chrome.storage.local and chrome.storage.sync APIs work identically in MV3 service workers as in MV2 background pages. If not, use message passing to offscreen document or content scripts as workaround.

4. **Browser Support Timeline**: We assume Chrome/Edge will deprecate MV2 in 2024-2025 timeframe. We maintain parallel MV2 branch for Firefox until Firefox adopts MV3 or provides equivalent migration path.

5. **Regex Performance**: We assume regex evaluation performance is similar between MV2 background page and MV3 service worker. If service workers are slower, we optimize by pre-compiling patterns and caching compiled RegExp objects.

**Migration Assumptions:**

6. **User Data Format**: We assume existing user data in chrome.storage follows documented Redirect object schema. Edge cases: Handle old data formats from versions prior to 3.0 if found in wild.

7. **Migration Timing**: We assume migration runs once on first launch of MV3 version. Users upgrading from ancient versions (<3.0) may need intermediate upgrade to 3.5.4 before 4.0.0.

8. **Rollback Requirement**: We assume some users will encounter issues with MV3 and need to roll back to MV2. Design: Export functionality and parallel MV2/MV3 releases support this.

**User Behavior Assumptions:**

9. **Rule Complexity**: We assume 90% of users have <50 redirect rules, 9% have 50-100 rules, 1% have >100 rules. Design: Optimize for <50 rules case, test extensively with 100+ rules.

10. **Browser Distribution**: We assume 60% Chrome, 25% Firefox, 10% Edge, 5% other (Opera, Vivaldi). Maintain first-class support for all.

11. **Sync Usage**: We assume <30% of users enable chrome.storage.sync. Most users rely on local storage or manual export/import.

**Constraints:**

12. **No External Dependencies**: We maintain Einar's decision to avoid external libraries/frameworks. Pure JavaScript only. Rationale: Simplicity, security, minimal attack surface.

13. **No Build Tools**: We avoid introducing webpack, bundlers, or transpilers unless absolutely required by MV3. Rationale: Keep barrier to contribution low, honor brownfield project principles.

14. **Backward Compatibility Priority**: When in conflict, we prioritize backward compatibility over code elegance. Rationale: User trust and Einar's legacy matter more than clean architecture.

---

## Open Questions Requiring Clarification

None at this time. All critical technical decisions have reasonable defaults based on MV3 documentation and brownfield project constraints. Implementation planning will validate assumptions and adjust as needed.
