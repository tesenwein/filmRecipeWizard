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
 * Create a standardized success response object
 * @param data - The data to include in the response
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(data: T) {
  return { success: true, ...data };
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

/**
 * Handle async operations with consistent error handling
 * @param operation - The async operation to execute
 * @param module - The module name for error logging
 * @param errorMessage - The error message to log
 * @returns Promise that resolves to success response or rejects with error
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  module: string,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logError(module, errorMessage, error);
    throw error;
  }
}

