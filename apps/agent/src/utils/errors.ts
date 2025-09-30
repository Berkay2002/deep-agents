// src/utils/errors.ts

/**
 * Base error class for Deep Agent errors
 */
export class DeepAgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a tool execution fails
 */
export class ToolExecutionError extends DeepAgentError {
  constructor(
    public readonly toolName: string,
    message: string,
    public readonly originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      `Tool '${toolName}' execution failed: ${message}`,
      "TOOL_EXECUTION_ERROR",
      { ...context, toolName, originalError: originalError?.message }
    );
  }
}

/**
 * Error thrown when a search operation times out
 */
export class SearchTimeoutError extends DeepAgentError {
  constructor(
    public readonly query: string,
    public readonly timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Search query timed out after ${timeoutMs}ms: "${query}"`,
      "SEARCH_TIMEOUT",
      { ...context, query, timeoutMs }
    );
  }
}

/**
 * Error thrown when MCP server connection fails
 */
export class MCPConnectionError extends DeepAgentError {
  constructor(
    public readonly serverName: string,
    message: string,
    public readonly originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      `Failed to connect to MCP server '${serverName}': ${message}`,
      "MCP_CONNECTION_ERROR",
      { ...context, serverName, originalError: originalError?.message }
    );
  }
}

/**
 * Error thrown when API rate limit is exceeded
 */
export class RateLimitError extends DeepAgentError {
  constructor(
    public readonly service: string,
    public readonly retryAfterMs?: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Rate limit exceeded for ${service}${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ""}`,
      "RATE_LIMIT_ERROR",
      { ...context, service, retryAfterMs }
    );
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Wrap in timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${opts.timeoutMs}ms`)),
          opts.timeoutMs
        )
      );

      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Log retry attempt
      console.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );

      // Wait before retrying with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  // All retries exhausted
  throw new DeepAgentError(
    `Operation failed after ${opts.maxAttempts} attempts: ${lastError?.message}`,
    "MAX_RETRIES_EXCEEDED",
    { maxAttempts: opts.maxAttempts, lastError: lastError?.message }
  );
}

/**
 * Wrap a tool execution with error handling
 */
export async function safeToolExecution<T>(
  toolName: string,
  fn: () => Promise<T>,
  fallbackValue?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Tool '${toolName}' failed:`, err);

    // If fallback value provided, return it instead of throwing
    if (fallbackValue !== undefined) {
      console.warn(`Returning fallback value for tool '${toolName}'`);
      return fallbackValue;
    }

    throw new ToolExecutionError(toolName, err.message, err);
  }
}

/**
 * Check if an error is retryable (network, timeout, rate limit)
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    /timeout/i,
    /ETIMEDOUT/i,
    /ECONNREFUSED/i,
    /ENOTFOUND/i,
    /network/i,
    /socket hang up/i,
    /rate limit/i,
    /429/i,
    /503/i,
    /502/i,
  ];

  return retryablePatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Format error for user-friendly display
 */
export function formatErrorForUser(error: Error): string {
  if (error instanceof SearchTimeoutError) {
    return `Search is taking longer than expected. The search for "${error.query}" timed out. Please try a more specific query.`;
  }

  if (error instanceof MCPConnectionError) {
    return `Unable to connect to external service '${error.serverName}'. This feature may be temporarily unavailable.`;
  }

  if (error instanceof RateLimitError) {
    return `Too many requests to ${error.service}. Please wait a moment before trying again.`;
  }

  if (error instanceof ToolExecutionError) {
    return `A tool encountered an error and couldn't complete: ${error.toolName}. Continuing with available tools.`;
  }

  if (error instanceof DeepAgentError) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}