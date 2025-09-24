# Legacy Code Cleanup Command

## Objective
Identify and remove legacy code, unused variables, and unnecessary fallbacks while preserving debugging capabilities.

## Search Strategy
1. **Unused Variables & Imports**
   - Find declared but never used variables
   - Locate imported modules/functions that aren't referenced
   - Check for duplicate imports

2. **Legacy Code Patterns**
   - Look for deprecated API usage
   - Find commented-out code blocks
   - Identify old function signatures or patterns
   - Search for TODO/FIXME comments that are outdated

3. **Unnecessary Fallbacks**
   - Find redundant error handling
   - Locate duplicate conditional checks
   - Identify overly defensive programming patterns
   - Check for unused default parameters

4. **Dead Code**
   - Find unreachable code after return statements
   - Locate unused function parameters
   - Check for empty catch blocks
   - Find unused event handlers

## What to Remove
- ✅ Unused variables, imports, and functions
- ✅ Commented-out code blocks
- ✅ Redundant error handling
- ✅ Unused parameters (unless part of interface)
- ✅ Dead code paths
- ✅ Duplicate imports
- ✅ Unused type definitions
- ✅ Useless console.log statements (temporary debugging, test logs)
- ✅ Console.log statements that don't provide value

## What to Preserve
- ❌ Useful debugging tools (debugger statements, breakpoints)
- ❌ Error logging and monitoring
- ❌ Performance monitoring code
- ❌ Console.log statements that provide meaningful information
- ❌ Development-only code with clear markers
- ❌ Debugging utilities and helper functions

## Process
1. Run comprehensive search across all source files
2. Analyze each finding for safety of removal
3. Remove identified legacy code
4. Verify no functionality is broken
5. Run `/codecheck` to validate changes

## Safety Notes
- Always test after removals
- Keep error handling that serves a purpose
- Preserve any code marked for future use
- Maintain API compatibility