/**
 * Error handling utilities for consistent error management across the application
 */

/**
 * Extract error message from unknown error type
 * @param error - The error to extract message from
 * @returns A string error message
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Create a standardized error response object
 * @param error - The error to create response for
 * @returns Standardized error response
 */
export function createErrorResponse(error: unknown) {
  return { success: false, error: getErrorMessage(error) };
}

/**
 * Log error with consistent formatting
 * @param module - The module name for logging context
 * @param message - The error message
 * @param error - The error object
 */
export function logError(module: string, message: string, error: unknown) {
  console.error(`[${module}] ${message}:`, error);
}

