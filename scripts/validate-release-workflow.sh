#!/bin/bash

# Script to validate that the release workflow has correct patterns
# This can be run to verify the fix is properly applied

echo "🔍 Validating Release Workflow Fix..."
echo

WORKFLOW_FILE=".github/workflows/build-and-release.yml"

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

echo "✅ Workflow file found: $WORKFLOW_FILE"
echo

# Check for incorrect patterns (should NOT be found)
echo "🔍 Checking for INCORRECT patterns (these should NOT exist):"
INCORRECT_PATTERNS=(
    "artifacts/build-mac/release/\*.dmg"
    "artifacts/build-mac/release/\*.zip" 
    "artifacts/build-win/release/\*.exe"
)

found_incorrect=false
for pattern in "${INCORRECT_PATTERNS[@]}"; do
    if grep -q "$pattern" "$WORKFLOW_FILE"; then
        echo "❌ Found incorrect pattern: $pattern"
        found_incorrect=true
    else
        echo "✅ Good - incorrect pattern not found: $pattern"
    fi
done
echo

# Check for correct patterns (should be found)
echo "🔍 Checking for CORRECT patterns (these should exist):"
CORRECT_PATTERNS=(
    "artifacts/build-mac/\*.dmg"
    "artifacts/build-mac/\*.zip"
    "artifacts/build-win/\*.exe"
)

found_correct=0
for pattern in "${CORRECT_PATTERNS[@]}"; do
    if grep -q "$pattern" "$WORKFLOW_FILE"; then
        echo "✅ Found correct pattern: $pattern"
        ((found_correct++))
    else
        echo "❌ Missing correct pattern: $pattern"
    fi
done
echo

# Validation summary
if [ "$found_incorrect" = false ] && [ "$found_correct" -eq 3 ]; then
    echo "🎉 VALIDATION PASSED: Workflow file has correct patterns!"
    echo "✅ All 3 correct patterns found"
    echo "✅ No incorrect patterns found"
    echo "✅ Release should work properly now"
    exit 0
else
    echo "❌ VALIDATION FAILED: Workflow file needs fixes"
    if [ "$found_incorrect" = true ]; then
        echo "❌ Found incorrect patterns that need removal"
    fi
    if [ "$found_correct" -lt 3 ]; then
        echo "❌ Missing correct patterns ($found_correct/3 found)"
    fi
    exit 1
fi