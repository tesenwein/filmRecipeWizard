#!/bin/bash
# Test script for validating the new release workflow
# This script simulates different release scenarios to verify the workflow logic

set -e

echo "=== Release Workflow Test Suite ==="
echo ""

# Function to reset test environment
reset_test() {
    unset GITHUB_REF
    unset GITHUB_REF_NAME
    unset GITHUB_EVENT_INPUTS_FORCE_RELEASE
}

# Function to test scenario
test_scenario() {
    local scenario_name="$1"
    local github_ref="$2"
    local github_ref_name="$3"
    local force_release="$4"
    
    echo "Testing: $scenario_name"
    echo "----------------------------------------"
    
    reset_test
    
    if [ -n "$github_ref" ]; then
        export GITHUB_REF="$github_ref"
    fi
    
    if [ -n "$github_ref_name" ]; then
        export GITHUB_REF_NAME="$github_ref_name"
    fi
    
    if [ -n "$force_release" ]; then
        export GITHUB_EVENT_INPUTS_FORCE_RELEASE="$force_release"
    fi
    
    # Simulate the workflow logic
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    echo "Current version: $CURRENT_VERSION"
    
    SHOULD_RELEASE=false
    VERSION_CHANGED=false
    IS_TAG_PUSH=false
    
    # Check if this is a tag push (from npm version)
    if [[ "$GITHUB_REF" == refs/tags/v* ]]; then
        IS_TAG_PUSH=true
        TAG_VERSION="$GITHUB_REF_NAME"
        echo "Tag push detected: $TAG_VERSION"
        
        # Extract version from tag (remove 'v' prefix)
        TAG_VERSION_NUMBER="${TAG_VERSION#v}"
        echo "Tag version number: $TAG_VERSION_NUMBER"
        
        # Check if tag version matches package.json version
        if [ "$TAG_VERSION_NUMBER" = "$CURRENT_VERSION" ]; then
            SHOULD_RELEASE=true
            echo "✅ Tag version matches package.json version - triggering release"
        else
            echo "⚠️  Warning: Tag version ($TAG_VERSION_NUMBER) doesn't match package.json version ($CURRENT_VERSION)"
            # Still trigger release but use package.json version
            SHOULD_RELEASE=true
            echo "✅ Still triggering release with package.json version"
        fi
    else
        # This is a regular commit push - check for manual version changes
        echo "Regular commit push - checking for version changes"
        
        # For testing, we'll assume no previous version change for simplicity
        # In real workflow, this would check git history
        echo "No version change detected in this test"
    fi
    
    # Force release if manually triggered
    if [ "$GITHUB_EVENT_INPUTS_FORCE_RELEASE" = "true" ]; then
        SHOULD_RELEASE=true
        echo "✅ Force release triggered"
    fi
    
    if [ "$SHOULD_RELEASE" = "false" ]; then
        echo "❌ No release trigger detected"
    fi
    
    echo "📊 Result: should_release=$SHOULD_RELEASE, version_changed=$VERSION_CHANGED, is_tag_push=$IS_TAG_PUSH"
    echo ""
}

# Test scenarios
test_scenario "npm version patch (matching version)" "refs/tags/v2.2.4" "v2.2.4" ""
test_scenario "npm version with mismatched version" "refs/tags/v2.2.5" "v2.2.5" ""
test_scenario "Regular commit push" "" "" ""
test_scenario "Force release via workflow dispatch" "" "" "true"
test_scenario "Invalid tag format" "refs/tags/release-2.2.4" "release-2.2.4" ""

echo "=== Test Suite Complete ==="
echo ""
echo "🎯 Expected behaviors:"
echo "1. npm version with matching version → should_release=true, is_tag_push=true"
echo "2. npm version with mismatched version → should_release=true (with warning)"
echo "3. Regular commit → should_release=false (unless version changed)"
echo "4. Force release → should_release=true"
echo "5. Invalid tag → should_release=false"
echo ""
echo "📖 Usage: Run this script anytime you modify the release workflow logic"
echo "💡 Tip: Test with actual npm version commands in a test branch"