/**
 * Deep Agents TypeScript Implementation
 *
 * A TypeScript port of the Python Deep Agents library for building controllable AI agents with LangGraph.
 * This implementation maintains 1:1 compatibility with the Python version.
 */

import type { InteropZodObject } from "@langchain/core/utils/types";
import type { z } from "zod";
import { createDeepAgent } from "./agent.js";
import { editFile, ls, readFile, writeFile, writeTodos } from "./tools.js";
import type { AnyAnnotationRoot, CreateDeepAgentParams } from "./types.js";

// Re-export using export from syntax
// biome-ignore lint/performance/noBarrelFile: <Its fine here>
export { createDeepAgent } from "./agent.js";
export { getDefaultModel } from "./model.js";
export {
  EDIT_DESCRIPTION,
  TASK_DESCRIPTION_PREFIX,
  TASK_DESCRIPTION_SUFFIX,
  TOOL_DESCRIPTION,
  WRITE_TODOS_DESCRIPTION,
} from "./prompts.js";
export { DeepAgentState, fileReducer } from "./state.js";
export { createTaskTool } from "./sub-agent.js";
export { editFile, ls, readFile, writeFile, writeTodos } from "./tools.js";
export type {
  AnyAnnotationRoot,
  CreateDeepAgentParams,
  CreateTaskToolParams,
  DeepAgentStateType,
  SubAgent,
  Todo,
  TodoStatus,
} from "./types.js";

/**
 * Create a Deep Agent with default configuration
 * This is a convenience function that creates a Deep Agent with the most common configuration
 */
export function createDefaultDeepAgent<
  StateSchema extends z.ZodObject<z.ZodRawShape>,
  ContextSchema extends
    | AnyAnnotationRoot
    | InteropZodObject = AnyAnnotationRoot,
>(params?: Omit<CreateDeepAgentParams<StateSchema, ContextSchema>, "tools">) {
  return createDeepAgent<StateSchema, ContextSchema>({
    tools: [editFile, ls, readFile, writeFile, writeTodos],
    ...params,
  });
}
