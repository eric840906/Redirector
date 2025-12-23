# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

For Redirector MV3 Migration, verify compliance with all 7 Core Principles:

### ✅ I. Chesterton's Fence (Code Archaeology First)
- [ ] Have you read and understood the existing code this change will affect?
- [ ] Have you documented why the current implementation exists?
- [ ] Have you searched commit history, comments, and issues for context?
- [ ] Can you explain Einar's original design decision to another developer?

### ✅ II. User Data is Sacred (Zero Data Loss Tolerance)
- [ ] Have you planned for automatic data backup before migration?
- [ ] Have you designed data migration with rollback capability?
- [ ] Have you identified real user data patterns to test against?
- [ ] Can you prove with tests that no data will be lost?

### ✅ III. Stability Over Features (Do No Harm)
- [ ] Is this change strictly required for MV3 compatibility? (If not, remove it)
- [ ] Have you planned regression tests before making changes?
- [ ] Will existing redirect rules work identically after this change?
- [ ] Are you avoiding "improvements" unrelated to MV3?

### ✅ IV. Minimal Viable Change (Smallest Possible Diff)
- [ ] Is this the smallest change that achieves MV3 compatibility?
- [ ] Have you documented alternatives considered and why they were rejected?
- [ ] Are you adapting existing code rather than rewriting it?
- [ ] Can you justify every changed line as necessary for MV3?

### ✅ V. Test Obsessively (High-Risk Surgery)
- [ ] Have you planned baseline tests for current MV2 functionality?
- [ ] Have you planned tests with real user redirect patterns?
- [ ] Have you planned edge case tests (circular redirects, malformed patterns, 100+ rules)?
- [ ] Have you planned cross-browser testing (Chrome, Firefox, Edge)?

### ✅ VI. Explicit Risk Assessment (Know What Can Go Wrong)
- [ ] Have you documented what could go wrong with this change?
- [ ] Have you identified the "blast radius" if this fails?
- [ ] Have you planned a rollback procedure?
- [ ] Can rollback be completed in < 5 minutes?

### ✅ VII. Preserve Backward Compatibility (Users Choose When to Upgrade)
- [ ] Will MV2 version continue working for Firefox/Edge users?
- [ ] Is data format compatible between MV2 and MV3?
- [ ] Have you planned a beta testing period?
- [ ] Can users export data, try MV3, and revert to MV2 with zero data loss?

**CRITICAL GATE**: If ANY checkbox above is unchecked, you MUST address it before proceeding to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
