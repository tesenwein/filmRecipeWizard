/**
 * Result filtering utilities for consistent result processing
 */

/**
 * Filter results to get only successful ones
 * @param results - Array of results to filter
 * @returns Array of successful results
 */
export function filterSuccessfulResults<T extends { success: boolean }>(results: T[]): T[] {
  return results.filter(result => result.success);
}

/**
 * Filter results to get only failed ones
 * @param results - Array of results to filter
 * @returns Array of failed results
 */
export function filterFailedResults<T extends { success: boolean; error?: string }>(results: T[]): T[] {
  return results.filter(result => !result.success && result.error);
}

/**
 * Check if any results have errors
 * @param results - Array of results to check
 * @returns True if any results have errors
 */
export function hasErrors<T extends { success: boolean; error?: string }>(results: T[]): boolean {
  return results.some(result => !result.success && result.error);
}


