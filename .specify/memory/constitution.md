<!--
SYNC IMPACT REPORT
==================
Version Change: N/A → 1.0.0 (Initial Constitution)
Rationale: First constitution for existing brownfield project (Redirector MV3 migration)

Modified Principles:
- N/A (initial creation)

Added Sections:
- Core Principles (7 principles for legacy code stewardship)
- Manifest V3 Migration Rules (MV3-specific requirements)
- Testing & Validation Requirements (brownfield testing strategy)
- Risk Management & Rollback (safety nets for production changes)
- Documentation Standards (archaeology and decision tracking)
- Governance (amendment and compliance procedures)

Removed Sections:
- N/A (initial creation)

Templates Requiring Updates:
- ✅ .specify/templates/plan-template.md - Constitution Check section aligned with 7 principles
- ✅ .specify/templates/spec-template.md - Edge cases section emphasizes data migration and backward compatibility
- ✅ .specify/templates/tasks-template.md - Added data migration tasks, rollback tasks, and real user data testing requirements
- ⚠️  .specify/templates/commands/*.md - Review agent guidance to reference Einar's legacy and "do no harm" philosophy

Follow-up TODOs:
- TODO(RATIFICATION_DATE): Set official adoption date when development team formally accepts this constitution
- TODO(TESTING): Establish baseline test suite for regression detection before any MV3 changes begin
- TODO(USER_DATA): Create representative test dataset from real user redirect rules (anonymized)
- TODO(ROLLBACK): Document current MV2 baseline as rollback target (version 3.5.4)
-->

# Redirector Project Constitution

**In memory of Einar Egilsson (1977–2024)**
*This constitution honors Einar's legacy by preserving the stability and reliability he built into Redirector for thousands of users over many years.*

## Core Principles

### I. Chesterton's Fence (Code Archaeology First)

**Before changing or removing ANY code, you MUST understand why it exists.**

- **REQUIRED**: Document your understanding of the code's purpose before modifying it
- **REQUIRED**: Search for related code, comments, commit history, and issues to understand context
- **REQUIRED**: Assume Einar had a good reason for every design decision until proven otherwise
- **FORBIDDEN**: Removing code because "it looks weird" or "I would have done it differently"
- **FORBIDDEN**: Refactoring for style preferences unrelated to the MV3 migration goal

**Rationale**: Einar built a working, stable extension trusted by thousands of users over 6+ years. Arrogance about legacy code causes data loss and breakage. Respect precedes change.

**Test**: Can you explain to another developer why this code exists and what problem it solves? If not, you haven't done enough archaeology.

---

### II. User Data is Sacred (Zero Data Loss Tolerance)

**Users have years of carefully crafted redirect rules. Losing their data is unacceptable.**

- **REQUIRED**: Test data migration with real user redirect rule exports (anonymized)
- **REQUIRED**: Implement automatic backup before any data schema changes
- **REQUIRED**: Provide data export before migration, data import after migration
- **REQUIRED**: Validate migrated data matches original data (automated test)
- **FORBIDDEN**: Migrations that can't be rolled back with full data restoration
- **FORBIDDEN**: Schema changes without backward compatibility plan
- **FORBIDDEN**: Deleting or modifying stored user data without explicit user consent

**Rationale**: User trust is earned over years and lost in seconds. One data loss incident destroys the extension's reputation and Einar's legacy.

**Test**: Can you prove with automated tests that no user data is lost during migration? Can users roll back to MV2 with their data intact?

---

### III. Stability Over Features (Do No Harm)

**The extension currently works. Keep it that way.**

- **REQUIRED**: Regression test suite covering core functionality before ANY changes
- **REQUIRED**: Manual testing on Chrome, Firefox, Edge with real redirect rules
- **REQUIRED**: Validation that existing rules work identically after migration
- **REQUIRED**: Load testing with users who have 100+ redirect rules
- **FORBIDDEN**: Adding new features during MV3 migration (scope creep)
- **FORBIDDEN**: "Improvements" or "modernizations" unrelated to Chrome MV3 compatibility
- **FORBIDDEN**: Refactoring working code unless it blocks MV3 migration

**Rationale**: The goal is Chrome compatibility via MV3, NOT a rewrite or feature expansion. Every change is risk. Minimize risk by minimizing changes.

**Test**: Can a user with 100 redirect rules upgrade without noticing any difference except "now works in Chrome"?

---

### IV. Minimal Viable Change (Smallest Possible Diff)

**Make the smallest change that achieves Manifest V3 compatibility. Nothing more.**

- **REQUIRED**: Justify why each change is necessary for MV3 compatibility
- **REQUIRED**: Document alternatives considered and why they were rejected
- **REQUIRED**: Keep diffs small, focused, and reviewable
- **REQUIRED**: Prefer adaptation over rewrite (wrap/proxy old code if needed)
- **FORBIDDEN**: Wholesale rewrites of working modules
- **FORBIDDEN**: Introducing new libraries, frameworks, or build tools unless absolutely necessary for MV3
- **FORBIDDEN**: Changing code style, formatting, or structure unrelated to MV3 requirements

**Rationale**: Large changes = large risk. Each unnecessary change is a potential bug. Brownfield development requires surgical precision, not bulldozers.

**Test**: Can you defend each changed line as necessary for MV3? If not, revert it.

---

### V. Test Obsessively (High-Risk Surgery)

**Brownfield changes without tests are gambling with user data.**

- **REQUIRED**: Regression tests for all existing functionality before starting MV3 work
- **REQUIRED**: Test with real user redirect rule patterns (regex, wildcards, advanced options)
- **REQUIRED**: Test edge cases: disabled rules, circular redirects, pattern errors, large rule sets
- **REQUIRED**: Test data migration with multiple realistic user datasets
- **REQUIRED**: Cross-browser testing (Chrome, Firefox, Edge) for every change
- **REQUIRED**: Performance testing with 100+ rules, complex regex patterns
- **FORBIDDEN**: Deploying changes without passing all regression tests
- **FORBIDDEN**: Testing only happy paths
- **FORBIDDEN**: Assuming "it works on my machine" is sufficient

**Rationale**: Users rely on this extension daily. Broken redirects disrupt workflows. No user should be a beta tester for untested MV3 changes.

**Test**: Does the test suite cover every user scenario from the README examples? Can you detect regressions automatically?

---

### VI. Explicit Risk Assessment (Know What Can Go Wrong)

**Every change must document its risks and rollback plan.**

- **REQUIRED**: Document known risks for each change (data loss, functionality breakage, performance degradation)
- **REQUIRED**: Provide rollback procedure for each migration step
- **REQUIRED**: Identify "blast radius" - what breaks if this change fails?
- **REQUIRED**: Document assumptions and their failure modes
- **REQUIRED**: Stage changes incrementally with rollback points
- **FORBIDDEN**: "Big bang" migrations without incremental rollback points
- **FORBIDDEN**: Changes without documented rollback procedures
- **FORBIDDEN**: Ignoring or dismissing edge cases as "unlikely"

**Rationale**: Production users can't wait for fixes. Rollback must be faster than debugging. Know your escape routes before entering dangerous territory.

**Test**: Can you roll back each change in production within 5 minutes? Is the rollback procedure tested?

---

### VII. Preserve Backward Compatibility (Users Choose When to Upgrade)

**Users should control their upgrade timing, not be forced into untested migrations.**

- **REQUIRED**: MV2 version continues to work for Firefox/Edge users
- **REQUIRED**: Clear versioning: MV2 branch (3.5.x) vs MV3 branch (4.0.x)
- **REQUIRED**: Data format compatible between MV2 and MV3 (users can switch back)
- **REQUIRED**: Release notes clearly document what changed and why
- **REQUIRED**: Opt-in beta testing period before stable MV3 release
- **FORBIDDEN**: Breaking changes to data storage format without migration tool
- **FORBIDDEN**: Forcing all users to MV3 before stability is proven
- **FORBIDDEN**: Deprecating MV2 support until Chrome mandates it

**Rationale**: Users have working setups. Don't break them. Let early adopters validate MV3 before wider rollout. Trust is earned through reliability.

**Test**: Can a user export their data from MV2, try MV3, and revert to MV2 with zero data loss if they encounter issues?

---

## Manifest V3 Migration Rules

### Required Changes Only

These changes are **REQUIRED** for Chrome MV3 compatibility:

1. **Manifest Version**: Update `manifest_version` from 2 to 3
2. **Background Scripts**: Convert persistent background page to service worker
3. **Permissions**: Replace `webRequest`/`webRequestBlocking` with `declarativeNetRequest` or equivalent
4. **Host Permissions**: Move `http://*/*` and `https://*/*` to `host_permissions`
5. **Action API**: Replace `browser_action` with `action` API
6. **Storage**: Ensure `chrome.storage` usage compatible with service worker (no localStorage)
7. **CSP**: Update Content Security Policy to MV3 requirements

### Evaluation Required

These changes are **POTENTIALLY NECESSARY** - evaluate based on actual Chrome MV3 requirements:

1. **URL Redirection Method**: Assess whether `declarativeNetRequest` can replicate existing redirect functionality
   - If insufficient: Document limitations and consider alternate approach (tabs API, etc.)
   - If sufficient: Migrate with comprehensive testing against all redirect patterns in README
2. **Notifications**: Verify `chrome.notifications` API works in MV3 service worker
3. **Tab Access**: Verify `chrome.tabs` API remains compatible
4. **Storage Migration**: If data format must change, implement migration with rollback

### Explicitly Forbidden

These changes are **FORBIDDEN** during MV3 migration:

1. **New Features**: No new redirect types, UI enhancements, or functionality additions
2. **UI Redesigns**: Keep existing popup.html and options UI structure
3. **Refactoring Utilities**: Do not refactor `js/util.js` or other stable utilities unless blocking MV3
4. **Build System Changes**: Do not introduce webpack, bundlers, or transpilers unless MV3 requires it
5. **Library Additions**: Do not add new dependencies unless MV3 API requires polyfills/adapters

---

## Testing & Validation Requirements

### Pre-Migration Baseline Tests

**MUST be completed BEFORE any MV3 changes begin:**

1. **Functionality Tests**: Validate all redirect types from README examples work in current MV2 version
2. **Data Integrity Tests**: Export/import rules, verify no data loss
3. **Performance Tests**: Measure redirect latency with 1, 10, 50, 100 rules
4. **Cross-Browser Tests**: Verify current behavior in Firefox, Chrome (MV2), Edge
5. **Edge Case Tests**: Circular redirects, malformed patterns, disabled rules, empty rule sets

### Migration Testing Strategy

**MUST be performed after EVERY MV3-related change:**

1. **Regression Testing**: Re-run all baseline tests, compare results
2. **Real User Data Testing**: Test with anonymized exports from real users (varied rule complexity)
3. **Cross-Browser Validation**: MV3 in Chrome/Edge, MV2 continues working in Firefox
4. **Performance Comparison**: Ensure MV3 performance equals or exceeds MV2 baseline
5. **Data Migration Testing**: Automated test that migrates MV2 data → MV3, validates equivalence
6. **Rollback Testing**: Verify rollback procedure restores full functionality

### User Acceptance Testing

**MUST be completed before stable release:**

1. **Beta Release**: Publish MV3 as beta/unstable for at least 2 weeks
2. **Real User Feedback**: Collect feedback from beta users with diverse redirect rule sets
3. **Dogfooding**: Developers must use MV3 version as daily driver for 1 week minimum
4. **Issue Triage**: Address all critical bugs and data loss reports before stable release

---

## Risk Management & Rollback

### Risk Categories

**CRITICAL (Must Have Rollback):**
- Data storage format changes
- Redirect execution logic changes
- Background script → service worker conversion

**HIGH (Needs Extensive Testing):**
- Permissions changes
- API replacements (webRequest → declarativeNetRequest)
- Cross-browser compatibility changes

**MEDIUM (Test Thoroughly):**
- Manifest structure changes
- UI API changes (browser_action → action)

**LOW (Verify Still Works):**
- Icon paths, metadata, descriptions

### Rollback Procedures

**Immediate Rollback (< 5 minutes):**
1. Revert to last known good version (3.5.4 baseline)
2. Publish emergency rollback update to browser stores
3. Document rollback reason for post-mortem

**Data Rollback:**
1. Users export data from failing MV3 version
2. Install MV2 version (3.5.x branch)
3. Import data via standard import mechanism
4. Validate rules work correctly

**Staged Rollout:**
1. Beta release: 1% of users (opt-in)
2. Monitor for 1 week: Check error reports, user feedback
3. Incremental: 10% → 25% → 50% → 100% over 4 weeks
4. Rollback trigger: >5% error rate or critical data loss reports

---

## Documentation Standards

### Code Archaeology Documentation

**When modifying existing code, document:**

1. **What**: What does this code currently do?
2. **Why**: Why did Einar implement it this way? (Infer from context, comments, commits)
3. **Change Rationale**: Why must this change for MV3?
4. **Alternatives Considered**: What other approaches were evaluated and rejected?
5. **Risk Assessment**: What could go wrong? What's the blast radius?

**Format** (as code comments):
```javascript
// CODE ARCHAEOLOGY (Author: [Your Name], Date: YYYY-MM-DD)
// ORIGINAL PURPOSE: [What this code does and why it exists]
// MV3 CHANGE REQUIRED: [Why this must change for MV3]
// ALTERNATIVES CONSIDERED: [Other approaches and why rejected]
// RISK: [What could break, rollback plan]
```

### Decision Log

**For significant changes, add entry to DECISIONS.md:**

```markdown
## [DECISION-###] Title
**Date**: YYYY-MM-DD
**Context**: MV3 requires [specific change]
**Decision**: [What we decided to do]
**Rationale**: [Why this approach vs alternatives]
**Consequences**: [Known tradeoffs, risks, limitations]
**Rollback**: [How to undo this decision if needed]
```

### Migration Testing Evidence

**For each change, document test results:**

1. Screenshots/videos of before/after behavior
2. Automated test output showing pass/fail
3. Performance comparison data (if applicable)
4. Cross-browser test results

---

## Performance Standards

### Redirect Performance

- **MUST NOT** degrade redirect latency by >10ms (measure p50, p95, p99)
- **MUST NOT** increase memory usage by >20% for equivalent rule sets
- **MUST NOT** cause UI jank or freezing during rule evaluation

### Scalability

- **MUST** support users with 100+ redirect rules without performance degradation
- **MUST** handle complex regex patterns efficiently (no regex DoS vulnerabilities)
- **MUST** maintain responsiveness with 1000+ tabs open

---

## Security Standards

### Data Protection

- **MUST NOT** introduce XSS vulnerabilities in popup/options UI
- **MUST NOT** expose user redirect rules to web pages or external sites
- **MUST** validate all user input (redirect patterns, regex) for safety
- **MUST** sanitize data before display to prevent injection attacks

### Permissions

- **MUST NOT** request broader permissions than necessary for MV3 compatibility
- **MUST** justify each permission in manifest with inline comments
- **MUST** document any new permissions in release notes

### Privacy

- **MUST NOT** introduce telemetry or tracking without explicit user consent
- **MUST NOT** send user data to external servers
- **MUST** honor Einar's privacy-first design philosophy

---

## Governance

### Amendment Procedure

This constitution can be amended when:

1. **MV3 Requirements Change**: Chrome updates MV3 spec, requiring new approach
2. **Critical Bugs Discovered**: Constitution rule blocks critical bug fix
3. **Principle Conflicts**: Two principles contradict in specific scenario

**Amendment Process:**

1. Propose amendment with detailed rationale
2. Document why current principle is insufficient/incorrect
3. Assess impact on existing work and templates
4. Update templates and documentation to reflect new principle
5. Version bump: MAJOR (breaking governance change) / MINOR (new principle) / PATCH (clarification)

### Compliance Reviews

**Every pull request MUST:**

1. Self-assess against all 7 Core Principles
2. Document which principles apply and how they're honored
3. Justify any exceptions with explicit risk assessment

**Before merge, reviewer MUST verify:**

1. Principles compliance claimed by author is accurate
2. Risk assessment is realistic and complete
3. Rollback plan is tested and viable
4. Tests cover regression and edge cases

### Constitution Supersedes Convenience

**When in conflict:**

- Constitution principles > velocity/deadlines
- User data safety > feature completeness
- Stability > elegance
- Backward compatibility > code cleanliness

**If you must violate a principle:**

1. Document the violation explicitly
2. Justify why no alternative exists
3. Get explicit approval from maintainers
4. Add compensating controls (extra tests, monitoring, rollback triggers)

---

## Tribute and Philosophy

This constitution exists to honor Einar Egilsson's legacy. Einar built Redirector with:

- **User focus**: Solving real problems for real people
- **Reliability**: Years of stable operation
- **Privacy**: No tracking, no data collection, user control
- **Generosity**: Free software maintained selflessly

As we migrate to Manifest V3, we carry forward his philosophy:

> "First, do no harm. Respect users. Respect their data. Respect their trust. Build tools that work, reliably, without drama or breakage. Code is for people, not the other way around."

**When in doubt, ask**: "What would honor Einar's legacy?"
The answer is usually: stability, user respect, and doing the right thing over the easy thing.

---

**Version**: 1.0.0 | **Ratified**: 2025-12-22 | **Last Amended**: 2025-12-22
