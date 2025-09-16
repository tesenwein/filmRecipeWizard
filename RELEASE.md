# Release Process

This repository supports two methods for creating releases:

## Method 1: Using `npm version` (Recommended)

This is the preferred method as it ensures version consistency and follows semantic versioning:

```bash
# For patch releases (2.2.4 -> 2.2.5)
npm version patch

# For minor releases (2.2.4 -> 2.3.0)  
npm version minor

# For major releases (2.2.4 -> 3.0.0)
npm version major

# Push the version commit and tag
git push && git push --tags
```

The `npm version` command will:
1. Update `package.json` and `package-lock.json`
2. Create a git commit with the version number
3. Create a git tag (e.g., `v2.2.5`)

When you push the tag, the GitHub Actions workflow will automatically:
1. Detect the version tag
2. Build the application for macOS and Windows
3. Create a GitHub release with built artifacts
4. Upload installers as downloadable assets

## Method 2: Manual Version Bump

You can also manually update the version in `package.json` and commit:

```bash
# Edit package.json to change version number
npm install  # Update package-lock.json
git commit -am "bump version to X.Y.Z"
git push
```

This will trigger the workflow based on detecting version changes in the commit.

## Force Release

You can also trigger a release manually through GitHub Actions:

1. Go to the "Actions" tab in GitHub
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Check "Force create release" option
5. Click "Run workflow"

## Troubleshooting

- **Release not created**: Check that the tag matches the `package.json` version
- **Build failures**: Check the GitHub Actions logs for specific errors
- **Duplicate releases**: The workflow automatically skips if a release already exists

## Workflow Details

The workflow triggers on:
- Push to `main` branch (for manual version bumps)
- Tag pushes matching `v*` pattern (for `npm version` releases)
- Manual workflow dispatch (force release)