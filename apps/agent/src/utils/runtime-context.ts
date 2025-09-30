// Runtime context for request-scoped data (like GitHub PAT from JWT)
// This uses AsyncLocalStorage to provide request-scoped storage

import { AsyncLocalStorage } from "node:async_hooks";

interface RuntimeContext {
  githubPat?: string;
  userId?: string;
  [key: string]: unknown;
}

const asyncLocalStorage = new AsyncLocalStorage<RuntimeContext>();

/**
 * Get the current runtime context
 * @returns Runtime context or undefined if not set
 */
export function getRuntimeContext(): RuntimeContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get a specific value from runtime context
 * @param key Context key to retrieve
 * @returns Value or undefined
 */
export function getContextValue<T = unknown>(key: string): T | undefined {
  const context = getRuntimeContext();
  return context?.[key] as T | undefined;
}

/**
 * Get GitHub PAT from runtime context
 * @returns GitHub PAT or undefined
 */
export function getGithubPat(): string | undefined {
  return getContextValue<string>("githubPat");
}

/**
 * Run a function with runtime context
 * @param context Runtime context to set
 * @param fn Function to run with context
 * @returns Result of function
 */
export function runWithContext<T>(
  context: RuntimeContext,
  fn: () => T
): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Run an async function with runtime context
 * @param context Runtime context to set
 * @param fn Async function to run with context
 * @returns Promise resolving to result of function
 */
export async function runWithContextAsync<T>(
  context: RuntimeContext,
  fn: () => Promise<T>
): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}
