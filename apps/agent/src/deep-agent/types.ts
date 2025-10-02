/**
 * TypeScript type definitions for Deep Agents
 *
 * This file contains all the TypeScript interfaces and types that correspond
 * to the Python TypedDict and other type definitions. Defines all necessary
 * TypeScript interfaces and types including StateSchemaType, SubAgent, Todo,
 * and proper generic types for state schemas.
 */

import type {
  BaseLanguageModelInput,
  LanguageModelOutput,
} from "@langchain/core/language_models/base";
import type { Runnable } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import type { HumanInterruptConfig } from "@langchain/langgraph/prebuilt";
import type { z } from "zod";

// Define LangGraphRunnableConfig locally since it's not exported properly
export type LangGraphRunnableConfig<ContextType = Record<string, unknown>> = {
  callbacks?: unknown;
  configurable?: ContextType;
  context?: ContextType;
  maxConcurrency?: number;
  metadata?: Record<string, unknown>;
  recursionLimit?: number;
  runId?: string;
  runName?: string;
  signal?: AbortSignal;
  store?: unknown;
  tags?: string[];
  timeout?: number;
  writer?: (chunk: unknown) => void;
};

// Import the actual state types from the state file
import type {
  DeepAgentStateAnnotation,
  DeepAgentStateType as ImportedDeepAgentStateType,
} from "./state.js";

// Use the actual state annotation type
export type AnyAnnotationRoot = typeof DeepAgentStateAnnotation;

export type InferZodObjectShape<T> = T extends z.ZodObject<infer Shape>
  ? Shape
  : never;

/**
 * SubAgent type matching Python's TypedDict structure
 */
export type SubAgent = {
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  model?: LanguageModelLike | string;
  middleware?: Record<string, unknown>[];
};

export type TodoStatus = "pending" | "in_progress" | "completed";

export type Todo = {
  content: string;
  status: TodoStatus;
};

export type LanguageModelLike = Runnable<
  BaseLanguageModelInput,
  LanguageModelOutput
>;

export type PostModelHook = (
  state: Record<string, unknown>,
  options:
    | Record<string, unknown>
    | LangGraphRunnableConfig<Record<string, unknown>>
    | (Record<string, unknown> &
        LangGraphRunnableConfig<Record<string, unknown>>)
) => Promise<Partial<Record<string, unknown>> | undefined>;

export type ToolInterruptConfig = Record<
  string,
  HumanInterruptConfig | boolean
>;

export type CreateDeepAgentParams = {
  tools?: StructuredTool[];
  instructions?: string;
  model?: LanguageModelLike | string;
  subagents?: SubAgent[];
  interruptConfig?: ToolInterruptConfig;
  builtinTools?: string[];
  stateSchema?: unknown;
};

export type CreateTaskToolParams = {
  subagents: SubAgent[];
  tools?: Record<string, StructuredTool>;
  model?: LanguageModelLike | string;
  stateSchema?: unknown;
};

// Re-export the state type for use in other files
export type DeepAgentStateType = ImportedDeepAgentStateType;
