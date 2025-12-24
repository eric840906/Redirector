# Contributing to Redirector

Thank you for your interest in contributing to Redirector!

**In Memory of Einar Egilsson** (1977-2024): This project was created and maintained by Einar for many years. We honor his legacy by preserving the stability and simplicity he built into this extension.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Code Guidelines](#code-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Constitution Principles](#constitution-principles)

---

## Development Setup

### Prerequisites

- **Chrome 88+** (for MV3 development)
- **Firefox 109+** (for MV2 maintenance)
- **Edge 88+** (for MV3 cross-browser testing)
- **Git** for version control
- **No build tools required** - Pure JavaScript (ES6), no transpilation

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/einaregilsson/Redirector.git
   cd Redirector
   ```

2. **Choose your branch** (see Branching Strategy below):
   ```bash
   # For MV3 development (Chrome/Edge):
   git checkout 001-mv3-migration

   # For MV2 maintenance (Firefox):
   git checkout mv2-maintenance
   ```

3. **Load in browser**:

   **Chrome/Edge (MV3)**:
   - Navigate to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the Redirector directory

   **Firefox (MV2)**:
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

4. **Import test data**:
   ```bash
   # Load test datasets from tests/baseline/datasets/
   # Use Settings → Import within the extension
   ```

---

## Branching Strategy

### Branch Overview

| Branch | Manifest | Target Browsers | Purpose | Status |
|--------|----------|----------------|---------|--------|
| `master` | MV2 | Historical baseline | Tagged as v3.5.4 - Einar's last stable release | Frozen |
| `mv2-maintenance` | MV2 | Firefox 109+ | MV2 maintenance for Firefox users | Active |
| `001-mv3-migration` | MV3 | Chrome 88+, Edge 88+ | MV3 migration development | Active |

### Branch Details

#### `master` (Frozen - MV2 v3.5.4)

- **Status**: Tagged as `v3.5.4` and frozen
- **Purpose**: Baseline reference for regression testing
- **Manifest**: Manifest V2
- **DO NOT** make changes to this branch
- Used for:
  - Baseline comparison during MV3 migration
  - Rollback reference if MV3 issues occur
  - Historical record of Einar's last stable release

#### `mv2-maintenance` (Active - MV2 for Firefox)

- **Status**: Active maintenance
- **Purpose**: Support Firefox users (MV2 still supported in Firefox)
- **Manifest**: Manifest V2
- **Target Browsers**: Firefox 109+, Opera, Vivaldi (MV2 variants)
- **Accepts**:
  - Bug fixes
  - Security updates
  - Firefox-specific compatibility fixes
  - Critical user-reported issues
- **Rejects**:
  - New features (stability focus)
  - MV3-related changes
  - Breaking changes
- **Release Naming**: `v3.5.x` (e.g., v3.5.5, v3.5.6)

#### `001-mv3-migration` (Active - MV3 Development)

- **Status**: Active development
- **Purpose**: Manifest V3 migration for Chrome/Edge
- **Manifest**: Manifest V3
- **Target Browsers**: Chrome 88+, Edge 88+ (Chromium-based)
- **Accepts**:
  - MV3 API migrations (webRequest → alternatives, background → service worker)
  - Bug fixes
  - Cross-browser compatibility fixes
  - **NO NEW FEATURES** (migration only, per Constitution)
- **Rejects**:
  - New features unrelated to MV3 compliance
  - MV2-specific code
  - Breaking changes to user data format
- **Release Naming**: `v4.0.0-beta.x` (beta), then `v4.0.0` (stable)

### Branch Workflow

#### For Bug Fixes (Affects Both MV2 and MV3)

1. **Fix in `mv2-maintenance` first** (simpler codebase):
   ```bash
   git checkout mv2-maintenance
   # Make fix, test, commit
   git commit -m "Fix: [description]"
   ```

2. **Cherry-pick or port to `001-mv3-migration`**:
   ```bash
   git checkout 001-mv3-migration
   git cherry-pick <commit-hash>
   # Or manually apply fix with MV3 adaptations
   ```

3. **Test in both branches** before releasing

#### For MV3-Specific Changes

1. **Work directly in `001-mv3-migration`**:
   ```bash
   git checkout 001-mv3-migration
   # Make MV3 changes, test, commit
   git commit -m "MV3: [description]"
   ```

2. **DO NOT backport to `mv2-maintenance`** (MV3-only changes)

#### For Firefox-Specific Changes

1. **Work directly in `mv2-maintenance`**:
   ```bash
   git checkout mv2-maintenance
   # Make Firefox fixes, test, commit
   git commit -m "Firefox: [description]"
   ```

2. **DO NOT merge to `001-mv3-migration`** (may not apply)

### Merge Strategy

- **NO merges between `mv2-maintenance` and `001-mv3-migration`**
- These are **parallel branches** with different manifest versions
- Share fixes via **cherry-pick** or **manual porting**
- Both branches remain independent

---

## Code Guidelines

### Constitution Principles (MUST READ)

Before contributing, read `.specify/memory/constitution.md`. Key principles:

1. **Chesterton's Fence**: Understand existing code before changing it
2. **User Data is Sacred**: Zero data loss tolerance
3. **Stability Over Features**: Do no harm
4. **Minimal Viable Change**: Smallest possible diff
5. **Test Obsessively**: High-risk surgery requires testing
6. **Explicit Risk Assessment**: Know what can go wrong
7. **Backward Compatibility**: Users choose when to upgrade

### Code Style

- **Pure JavaScript ES6** (no TypeScript, no build tools)
- **No external dependencies** (browser APIs only)
- **Minimal abstractions** (keep it simple, like Einar did)
- **CODE ARCHAEOLOGY comments** for MV3 changes:
  ```javascript
  // CODE ARCHAEOLOGY: MV3 Migration - Changed from webRequest blocking to non-blocking
  // Reason: MV3 removed blocking webRequest, using tabs.update instead
  // Original code (MV2): return {redirectUrl: newUrl};
  chrome.tabs.update(details.tabId, {url: newUrl}); // MV3 alternative
  ```

### File Organization

- **DO NOT** move files or restructure directories
- **DO NOT** introduce build tools (webpack, rollup, etc.)
- **DO NOT** add external libraries (jQuery, lodash, etc.)
- Preserve Einar's simple directory structure

### Naming Conventions

- Follow existing patterns in the codebase
- Variables: `camelCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (if truly constant)
- No unnecessary renaming

---

## Testing Requirements

### Before Submitting Any Code

1. **Manual Testing**:
   - Load extension in target browser
   - Import test datasets from `tests/baseline/datasets/`
   - Test all README examples (de-mobilizer, AMP redirect, etc.)
   - Verify no console errors
   - Test export/import functionality

2. **Baseline Comparison** (MV3 only):
   - Run tests from `tests/baseline/readme-examples.js`
   - Compare behavior to MV2 v3.5.4 (must be identical)
   - Check performance within targets (≤10ms slower, ≤20% memory)

3. **Edge Cases** (see `tests/baseline/edge-cases.js`):
   - Test with 0 rules (empty state)
   - Test with 100+ rules (load test)
   - Test disabled rules
   - Test exclude patterns
   - Test URL decode/encode processing

4. **Cross-Browser** (if applicable):
   - Chrome 120+ (MV3)
   - Firefox 120+ (MV2)
   - Edge 120+ (MV3)

### Regression Prevention

- **Never skip testing** - This is a 6-year-old codebase with real users
- **Verify rollback works** - Export from your branch, import into stable
- **Check for data loss** - Compare exported JSON before/after changes

---

## Pull Request Process

### PR Checklist

Before submitting a PR:

- [ ] **Tested locally** in target browser(s)
- [ ] **Baseline tests pass** (if MV3 migration work)
- [ ] **No console errors** in extension
- [ ] **Export/import tested** (data preservation verified)
- [ ] **CODE ARCHAEOLOGY comments added** (for significant changes)
- [ ] **Updated CHANGELOG.md** (if applicable)
- [ ] **Branched from correct base**:
  - MV2 fixes → `mv2-maintenance`
  - MV3 work → `001-mv3-migration`
- [ ] **Commit messages clear** and reference issue numbers

### PR Template

```markdown
## Description
[Brief description of changes]

## Related Issue
Fixes #[issue number]

## Type of Change
- [ ] Bug fix (MV2)
- [ ] Bug fix (MV3)
- [ ] MV3 migration work
- [ ] Firefox-specific fix
- [ ] Documentation update

## Testing Performed
- [ ] Tested in Chrome [version]
- [ ] Tested in Firefox [version]
- [ ] Tested with baseline datasets
- [ ] Export/import verified
- [ ] No data loss confirmed

## Checklist
- [ ] Code follows project style
- [ ] Constitution principles honored
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] No new dependencies introduced
```

### Review Process

1. **Code Review**: Maintainers review for:
   - Constitution compliance
   - Code quality and simplicity
   - Test coverage
   - Backward compatibility

2. **Testing**: PR will be tested in:
   - Chrome (MV3 PRs)
   - Firefox (MV2 PRs)
   - Edge (MV3 PRs)

3. **Merge**: After approval, PR merged to target branch

---

## Constitution Principles

**CRITICAL**: Read `.specify/memory/constitution.md` before contributing.

This project follows strict principles to honor Einar's legacy and protect user data:

- **Respect the original author's decisions** (Chesterton's Fence)
- **User data is SACRED** - Zero data loss tolerance
- **Stability over features** - Do no harm
- **Minimal changes only** - MV3 migration, not a rewrite
- **Test obsessively** - This is high-risk surgery on production code
- **Explicit risk assessment** - Know what can break
- **Backward compatibility** - Users must be able to roll back

**If in doubt, ask first**. Better to discuss than to submit a PR that violates these principles.

---

## Questions or Help?

- **GitHub Issues**: [https://github.com/einaregilsson/Redirector/issues](https://github.com/einaregilsson/Redirector/issues)
- **Discussions**: Use GitHub Discussions for questions
- **MV3 Migration**: See `specs/001-mv3-migration/` for detailed documentation

---

## Thank You!

Your contributions help keep Redirector alive for thousands of users worldwide. By following these guidelines, you help us maintain the quality and stability Einar built into this project.

In memory of Einar Egilsson - Thank you for Redirector. 🙏
