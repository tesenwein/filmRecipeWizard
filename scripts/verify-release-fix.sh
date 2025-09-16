#!/bin/bash

echo "=== Film Recipe Wizard Release Fix Verification ==="
echo ""

# Check workflow structure
echo "🔍 Verifying workflow structure..."
WORKFLOW_FILE=".github/workflows/build-and-release.yml"

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found!"
    exit 1
fi

# Check for required jobs
JOBS=$(yq eval '.jobs | keys | .[]' "$WORKFLOW_FILE" | wc -l)
if [ "$JOBS" -eq 3 ]; then
    echo "✅ All 3 required jobs found (check-release, build, release)"
else
    echo "❌ Missing jobs. Expected 3, found $JOBS"
    yq eval '.jobs | keys' "$WORKFLOW_FILE"
    exit 1
fi

# Check release job structure
RELEASE_STEPS=$(yq eval '.jobs.release.steps | length' "$WORKFLOW_FILE")
if [ "$RELEASE_STEPS" -ge 6 ]; then
    echo "✅ Release job has $RELEASE_STEPS steps"
else
    echo "❌ Release job missing steps. Expected 6+, found $RELEASE_STEPS"
    exit 1
fi

# Check release job dependencies
NEEDS_OUTPUT=$(yq eval '.jobs.release.needs' "$WORKFLOW_FILE")
if echo "$NEEDS_OUTPUT" | grep -q "check-release" && echo "$NEEDS_OUTPUT" | grep -q "build"; then
    echo "✅ Release job properly depends on check-release and build"
else
    echo "❌ Release job dependencies incorrect: $NEEDS_OUTPUT"
    exit 1
fi

# Check trigger conditions
TRIGGERS=$(yq eval '.on.push.tags[]' "$WORKFLOW_FILE" | grep -c "v\*")
if [ "$TRIGGERS" -eq 1 ]; then
    echo "✅ Tag trigger configured for v* pattern"
else
    echo "❌ Tag trigger not properly configured"
    exit 1
fi

# Check if electron-builder config exists
if jq -e '.build' package.json > /dev/null 2>&1; then
    echo "✅ Electron-builder configuration found"
else
    echo "❌ Electron-builder configuration missing"
    exit 1
fi

# Check build scripts
REQUIRED_SCRIPTS=("prepare:build" "package:mac:universal" "package:win")
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if jq -e ".scripts[\"$script\"]" package.json > /dev/null 2>&1; then
        echo "✅ Script '$script' found"
    else
        echo "❌ Required script '$script' missing"
        exit 1
    fi
done

echo ""
echo "🎉 All checks passed! Release workflow should work correctly."
echo ""
echo "📋 To test the fix:"
echo "   1. Create a new version: npm version patch"
echo "   2. Push the commit: git push"  
echo "   3. Push the tag: git push --tags"
echo "   4. Check GitHub Actions for workflow run"
echo "   5. Verify release is created with DMG/ZIP/EXE files"
echo ""
echo "🔧 Alternative force release:"
echo "   1. Go to GitHub Actions tab"
echo "   2. Select 'Build and Release' workflow"
echo "   3. Click 'Run workflow'"
echo "   4. Check 'Force create release' option"
echo "   5. Click 'Run workflow'"