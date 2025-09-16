# Release Test Instructions

## Summary

The release process has been fixed. The issue was that the GitHub Actions workflow was using incorrect file patterns that included an extra `/release/` subdirectory that doesn't exist in the artifact structure.

## What Was Fixed

The file patterns in `.github/workflows/build-and-release.yml` were corrected from:
```yaml
files: |
  artifacts/build-mac/release/*.dmg
  artifacts/build-mac/release/*.zip
  artifacts/build-win/release/*.exe
```

To:
```yaml
files: |
  artifacts/build-mac/*.dmg
  artifacts/build-mac/*.zip
  artifacts/build-win/*.exe
```

**Note:** This fix was actually already applied to the main branch after v2.2.11, but v2.2.11 still used the broken patterns.

## Testing the Fix

To test that the fix works, you have two options:

### Option 1: Merge this PR and let automatic release trigger
1. Merge this PR to main
2. The workflow will automatically detect the version change (2.2.12 → 2.2.13)
3. It will build Mac and Windows binaries
4. It will create a v2.2.13 release with the binaries attached

### Option 2: Manual workflow trigger
1. Go to Actions → Build and Release workflow
2. Click "Run workflow" 
3. Select main branch
4. Check "Force create release even for non-versioned commits"
5. Click "Run workflow"

## Expected Results

After the workflow runs successfully, the v2.2.13 release should have:
- ✅ `Film-Recipe-Wizard-2.2.13-mac-universal.dmg` (macOS installer)
- ✅ `Film-Recipe-Wizard-2.2.13-mac-universal.zip` (macOS app bundle)
- ✅ `Film-Recipe-Wizard-2.2.13-Setup.exe` (Windows installer)

## Verification

You can verify the fix by:
1. Checking the workflow logs show files being found (not "does not match any files")
2. Confirming the release has downloadable binary assets
3. Testing that the installers actually work on Mac and Windows

## What Was Wrong Before

The v2.2.11 release failed because:
1. Build jobs uploaded artifacts from `release/` directory
2. Download artifacts action placed them in `artifacts/build-{platform}/` 
3. But the release job looked for files in `artifacts/build-{platform}/release/`
4. The extra `/release/` subdirectory didn't exist, so no files were found
5. Release was created but with no binary attachments

The fix removes the extra `/release/` from the file patterns to match the actual artifact structure.