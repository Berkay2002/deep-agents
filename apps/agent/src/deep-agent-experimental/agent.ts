/**
 * Main createDeepAgent function for Deep Agents
 *
 * Main entry point for creating deep agents with TypeScript types for all parameters:
 * tools, instructions, model, subagents, and stateSchema. Combines built-in tools with
 * provided tools, creates task tool using createTaskTool(), and returns createReactAgent
 * with proper configuration. Ensures exact parameter matching and behavior with Python version.
 */
/** biome-ignore-all lint/correctness/noUnusedImports: <> */

import type { Runnable } from "@langchain/core/runnables";
import type { StructuredTool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createInterruptHook } from "./interrupt.js";
import {
  allMiddlewareMessageModifier,
  allMiddlewareTools,
} from "./middleware/stable.js";
import { getDefaultModel } from "./model.js";
import { DeepAgentState, DeepAgentStateAnnotation } from "./state.js";
import { createTaskTool } from "./sub-agent.js";
import type { CreateDeepAgentParams, PostModelHook } from "./types.js";

/**
 * Base prompt that provides instructions about available tools
 * Ported from Python implementation to ensure consistent behavior
 */
const BASE_PROMPT = `You have access to a number of standard tools

## \`write_todos\`

You have access to the \`write_todos\` tools to help you manage and plan tasks. Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress.
These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable.

It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.
## \`task\`

- When doing web search, prefer to use the \`task\` tool in order to reduce context usage.`;

/**
 * Built-in tools that are always available in Deep Agents
 */
const BUILTIN_TOOLS: StructuredTool[] = allMiddlewareTools;

/**
 * Create a Deep Agent with TypeScript types for all parameters.
 * Combines built-in tools with provided tools, creates task tool using createTaskTool(),
 * and returns createReactAgent with proper configuration.
 * Ensures exact parameter matching and behavior with Python version.
 *
 */
export function createDeepAgent(
  params: CreateDeepAgentParams = {}
): Runnable<Record<string, unknown>, Record<string, unknown>> {
  const {
    tools = [],
    instructions,
    model = getDefaultModel(),
    subagents = [],
    interruptConfig = {},
    builtinTools,
  } = params;

  // Ensure model is a LanguageModelLike instance
  const resolvedModel = typeof model === "string" ? getDefaultModel() : model;

  const stateSchema = params.stateSchema || DeepAgentState;

  // Filter built-in tools if builtinTools parameter is provided
  const selectedBuiltinTools = builtinTools
    ? BUILTIN_TOOLS.filter((tool) =>
        builtinTools.some((bt) => bt === tool.name)
      )
    : BUILTIN_TOOLS;

  // Combine built-in tools with provided tools
  const allTools: StructuredTool[] = [...selectedBuiltinTools, ...tools];
  // Create task tool using createTaskTool() if subagents are provided
  if (subagents.length > 0) {
    // Create tools map for task tool creation
    const toolsMap: Record<string, StructuredTool> = {};
    for (const tool of allTools) {
      if (tool.name) {
        toolsMap[tool.name] = tool;
      }
    }

    const taskTool = createTaskTool({
      subagents,
      tools: toolsMap,
      model: resolvedModel,
      stateSchema: stateSchema as Record<string, unknown>,
    });
    allTools.push(taskTool);
  }

  // Combine instructions with base prompt and middleware system prompts
  const finalInstructions = instructions
    ? instructions + BASE_PROMPT + allMiddlewareMessageModifier("")
    : BASE_PROMPT + allMiddlewareMessageModifier("");

  let selectedPostModelHook: PostModelHook | undefined;
  if (Object.keys(interruptConfig).length > 0) {
    selectedPostModelHook = createInterruptHook(interruptConfig);
  } else {
    selectedPostModelHook = undefined;
  }

  // Return createReactAgent with proper configuration
  return createReactAgent({
    llm: resolvedModel,
    tools: allTools,
    stateSchema:
      (stateSchema as typeof DeepAgentStateAnnotation) ||
      DeepAgentStateAnnotation,
    messageModifier: finalInstructions,
    // biome-ignore lint/suspicious/noExplicitAny: <no other solution>
    postModelHook: selectedPostModelHook as any,
  });
}
