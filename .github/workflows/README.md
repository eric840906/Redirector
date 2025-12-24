# GitHub Actions Workflows

This directory contains automated workflows for building and releasing the Redirector extension.

## Available Workflows

### 1. Build Extension Packages (`build.yml`)

**Purpose**: Automatically build extension packages for all browsers on every push/PR.

**Triggers**:
- Push to `001-mv3-migration` or `master` branches
- Pull requests to these branches
- Manual trigger via GitHub Actions UI

**Outputs**:
- Chrome package artifact
- Edge package artifact
- Opera package artifact
- Firefox package artifact

**Usage**:
```bash
# Automatically runs on push/PR
git push origin 001-mv3-migration

# Or trigger manually:
# 1. Go to GitHub → Actions → "Build Extension Packages"
# 2. Click "Run workflow"
# 3. Select branch
# 4. Click "Run workflow"
```

**Artifacts**:
- Artifacts are available for 30 days
- Download from workflow run page

---

### 2. Build and Release (`release.yml`)

**Purpose**: Create a new GitHub release with packaged extensions ready for distribution.

**Triggers**:
- Manual trigger only (workflow_dispatch)

**Inputs**:
- `version`: Release version (e.g., "4.0.0")
- `prerelease`: Mark as pre-release/beta (checkbox)

**Outputs**:
- GitHub Release with tag (e.g., `v4.0.0` or `v4.0.0-beta`)
- 4 downloadable packages attached to release
- Build artifacts (retained for 90 days)

**Usage**:

#### Step 1: Update Version Numbers

Before creating a release, update version in both manifests:

```bash
# Update manifest.json (MV3)
# Change "version": "4.0.0"

# Update manifest-firefox.json (MV2)
# Change "version": "3.5.5" (or appropriate MV2 version)

git add manifest.json manifest-firefox.json
git commit -m "chore: Bump version to 4.0.0"
git push
```

#### Step 2: Trigger Release Workflow

1. Go to GitHub → **Actions** tab
2. Select **"Build and Release"** workflow
3. Click **"Run workflow"** button
4. Fill in the inputs:
   - **Use workflow from**: Select `master` or `001-mv3-migration`
   - **Release version**: Enter version (e.g., `4.0.0`)
   - **Mark as pre-release**: Check for beta releases
5. Click **"Run workflow"**

#### Step 3: Verify Release

1. Wait for workflow to complete (~1-2 minutes)
2. Go to **Releases** tab
3. Verify the new release appears with:
   - Correct tag (`v4.0.0` or `v4.0.0-beta`)
   - 4 downloadable packages
   - Release notes

---

## Release Workflow Details

### What It Does

1. **Checkout code**: Gets the latest code from the repository
2. **Set up Python**: Installs Python 3.x
3. **Verify version**: Checks that `manifest.json` version matches release version
4. **Build packages**: Runs `build.py` to create all 4 packages
5. **Create release**: Creates GitHub release with:
   - Tag (e.g., `v4.0.0`)
   - Release title
   - Release notes (auto-generated)
   - Package attachments
6. **Upload artifacts**: Stores packages as workflow artifacts (90-day retention)

### Version Verification

The workflow will **fail** if the version in `manifest.json` doesn't match the input version. This prevents releasing with incorrect version numbers.

**Example Error**:
```
Warning: Manifest version (4.0.0) doesn't match release version (4.0.1)
Please update manifest.json and manifest-firefox.json before creating release
```

**Fix**: Update manifests and push before re-running workflow.

---

## Release Checklist

Use this checklist when creating a release:

- [ ] All code changes committed and pushed
- [ ] Version updated in `manifest.json`
- [ ] Version updated in `manifest-firefox.json` (if needed)
- [ ] `CHANGELOG.md` updated with release notes
- [ ] Tests passing locally
- [ ] Ready for production

Then:

- [ ] Run "Build and Release" workflow
- [ ] Verify release created successfully
- [ ] Test download and install packages
- [ ] Announce release to users

---

## Package Details

### Chrome Package (`redirector-chrome.zip`)
- Manifest V3
- Includes: migration.js, declarative-rules.js
- For: Chrome 88+

### Edge Package (`redirector-edge.zip`)
- Manifest V3 (same as Chrome)
- For: Edge 88+

### Opera Package (`redirector-opera.zip`)
- Manifest V3
- Options UI customized for Opera
- For: Opera (Chromium-based)

### Firefox Package (`redirector-firefox.xpi`)
- Manifest V2
- Excludes: migration.js, declarative-rules.js
- For: Firefox 109+

---

## Troubleshooting

### Workflow Fails on Version Check

**Problem**:
```
Manifest version (X.Y.Z) doesn't match release version (A.B.C)
```

**Solution**:
1. Update `manifest.json` to match release version
2. Update `manifest-firefox.json` if needed
3. Commit and push
4. Re-run workflow

### Packages Missing from Release

**Problem**: Release created but no attached files

**Solution**:
1. Check workflow logs for errors in "Build extension packages" step
2. Verify `build.py` runs successfully locally: `python3 build.py`
3. Check that `build/` directory contains all 4 packages

### Workflow Doesn't Appear in Actions Tab

**Problem**: Can't find "Build and Release" workflow

**Solution**:
1. Ensure `.github/workflows/release.yml` is committed to repository
2. Push to `master` or `001-mv3-migration` branch
3. Wait a few seconds for GitHub to detect the workflow

---

## Example Release Process

### Creating Beta Release (v4.0.0-beta.1)

```bash
# 1. Update versions
vim manifest.json  # Set "version": "4.0.0"
vim manifest-firefox.json  # Set "version": "3.5.5"
git add manifest*.json
git commit -m "chore: Bump version to 4.0.0-beta.1"
git push

# 2. Trigger workflow
# Go to GitHub Actions → "Build and Release"
# Input: version = "4.0.0", prerelease = checked
# Click "Run workflow"

# 3. Verify release
# Check Releases tab for v4.0.0-beta tag
# Test download and installation
```

### Creating Stable Release (v4.0.0)

```bash
# 1. Update versions (if not already done)
vim manifest.json  # Ensure "version": "4.0.0"
git add manifest.json
git commit -m "chore: Release v4.0.0"
git push

# 2. Trigger workflow
# Go to GitHub Actions → "Build and Release"
# Input: version = "4.0.0", prerelease = unchecked
# Click "Run workflow"

# 3. Announce release
# Update documentation
# Notify users via channels
```

---

## Security

- Workflows use `GITHUB_TOKEN` with `contents: write` permission
- Only repository collaborators can trigger manual workflows
- No secrets or credentials are exposed in logs
- All builds run in isolated GitHub-hosted runners

---

## Support

For issues with the workflows:
1. Check workflow logs in Actions tab
2. Review this README
3. Open an issue with `workflow` label
