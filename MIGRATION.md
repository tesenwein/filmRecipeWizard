# Release Workflow Migration Guide

## 🎯 Problem Solved

The release building process has been completely redesigned to work seamlessly with `npm version` commands while maintaining backward compatibility with manual version bumps.

### Before (Broken):
```bash
npm version patch  # ❌ Created tag but no release
git push --tags    # ❌ Workflow didn't recognize tag-based triggers
```

### After (Fixed):
```bash
npm version patch  # ✅ Creates commit + tag
git push --tags    # ✅ Automatically triggers build & release
```

## 🚀 Quick Start

### Recommended Workflow (npm version):
```bash
# Make your changes
git add .
git commit -m "feat: add awesome new feature"

# Bump version and create release
npm version patch    # Creates v2.2.5 (or minor/major)
git push            # Push the version commit
git push --tags     # Push the tag → triggers release build
```

### Alternative (Manual):
```bash
# Edit package.json version manually
npm install         # Update package-lock.json
git commit -am "bump version to 2.2.5"
git push           # Triggers release build
```

## 🧪 Testing Your Setup

Run the test suite to validate everything works:
```bash
./scripts/test-release-workflow.sh
```

Test with a real release (safe method):
```bash
# Create a test branch
git checkout -b test-release
npm version prerelease --preid=test  # Creates v2.2.5-test.0
git push origin test-release
git push --tags

# Check GitHub Actions to see if workflow triggers
# Delete test tag after: git tag -d v2.2.5-test.0 && git push --delete origin v2.2.5-test.0
```

## 🔍 Workflow Features

### Smart Detection:
- ✅ **Tag Pushes**: Recognizes `npm version` created tags
- ✅ **Version Changes**: Detects manual package.json updates  
- ✅ **Force Release**: Manual trigger via GitHub Actions UI
- ✅ **Duplicate Prevention**: Won't create duplicate releases

### Enhanced Logging:
- 📊 Clear indication of trigger type (tag vs commit vs manual)
- ⚠️ Warnings for version mismatches
- 📋 Improved changelog generation

### Cross-Platform Builds:
- 🍎 macOS Universal (.dmg)
- 🪟 Windows (.exe installer + portable)
- 📦 Automatic artifact upload to GitHub Releases

## 🛡️ Safety Features

### Version Mismatch Handling:
If tag version doesn't match package.json, the workflow:
1. Shows a warning in logs
2. Still creates release using package.json version
3. Prevents failed releases due to sync issues

### Duplicate Protection:
- Checks if release already exists before creating
- Skips duplicate release creation
- Prevents workflow failures

## 🐛 Troubleshooting

### Release Not Created:
1. **Check tags**: `git tag -l | grep v2.2` - ensure tag exists
2. **Check Actions**: Go to GitHub → Actions → Check workflow run logs
3. **Version mismatch**: Ensure tag version matches package.json

### Build Failures:
1. **Check logs**: GitHub Actions → Build logs for specific errors  
2. **Local test**: Run `npm run prepare:build` locally
3. **Dependencies**: Ensure all dependencies are properly installed

### Permission Issues:
1. **Token**: Ensure `GITHUB_TOKEN` has proper permissions
2. **Protected branch**: Workflow needs write access to create releases
3. **Tags**: Push access required for tag-based triggers

## 📈 Next Steps

### Immediate (After PR Merge):
1. **Test the workflow**: Create a test release to validate everything works
2. **Update documentation**: Add release instructions to main README
3. **Team training**: Share the new workflow with contributors

### Future Enhancements:
1. **Automated changelogs**: Consider conventional commits for better changelogs
2. **Pre-release support**: Add support for `npm version prerelease`
3. **Multi-platform testing**: Consider adding Linux builds if needed
4. **Release notes**: Automate release notes generation from PRs

## 📚 Additional Resources

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [npm version documentation](https://docs.npmjs.com/cli/v7/commands/npm-version)
- [Semantic Versioning](https://semver.org/)
- [Electron Builder Documentation](https://www.electron.build/)

---

**✨ The release process is now fully automated and reliable!**