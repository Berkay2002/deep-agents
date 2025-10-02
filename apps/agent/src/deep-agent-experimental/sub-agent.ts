/**
 * SubAgent implementation for Deep Agents
 *
 * Task tool creation and sub-agent management.
 * Creates SubAgent interface matching Python's TypedDict structure and implements
 * createTaskTool() function that creates agents map, handles tool resolution by name,
 * and returns a tool function that uses createReactAgent for sub-agents.
 */

import type { LanguageModelLike } from "@langchain/core/language_models/base";
import { ToolMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { allMiddlewareTools } from "./middleware/stable.js";
import { TASK_DESCRIPTION_PREFIX, TASK_DESCRIPTION_SUFFIX } from "./prompts.js";
import type { SubAgent } from "./types.js";

/**
 * Create task tool function that creates agents map, handles tool resolution by name,
 * and returns a tool function that uses createReactAgent for sub-agents.
 * Uses Command for state updates and navigation between agents.
 */
export function createTaskTool(inputs: {
  subagents: SubAgent[];
  tools: Record<string, StructuredTool>;
  model: LanguageModelLike | string;
  stateSchema?: Record<string, unknown>;
}): StructuredTool {
  const { subagents, tools = {}, model = "openai:gpt-4o-mini" } = inputs;

  // Ensure model is a LanguageModelLike instance
  const resolvedModel = model;

  // Built-in tools map for tool resolution by name
  const builtinTools: Record<string, StructuredTool> = {};
  for (const middlewareTool of allMiddlewareTools) {
    if (middlewareTool.name) {
      builtinTools[middlewareTool.name] = middlewareTool;
    }
  }

  // Combine built-in tools with provided tools for tool resolution
  const allTools = { ...builtinTools, ...tools };

  // Pre-create all agents like Python does
  const agentsMap = new Map<string, ReturnType<typeof createReactAgent>>();
  for (const subagent of subagents) {
    // Resolve tools by name for this subagent
    const subagentTools: StructuredTool[] = [];
    if (subagent.tools) {
      for (const toolName of subagent.tools) {
        const resolvedTool = allTools[toolName];
        if (resolvedTool) {
          subagentTools.push(resolvedTool);
        }
        // Note: Missing tools are silently ignored to avoid console usage
      }
    } else {
      // If no tools specified, use all tools like Python does
      subagentTools.push(...Object.values(allTools));
    }

    // Create react agent for the subagent (pre-create like Python)
    const reactAgent = createReactAgent({
      llm:
        (subagent.model as LanguageModelLike) ??
        (resolvedModel as LanguageModelLike),
      tools: subagentTools,
      messageModifier: subagent.prompt,
    });

    agentsMap.set(subagent.name, reactAgent);
  }

  return tool(
    async (input: unknown, config: ToolRunnableConfig) => {
      const { description, subagentType } = input as {
        description: string;
        subagentType: string;
      };

      // Get the pre-created agent
      const reactAgent = agentsMap.get(subagentType);
      if (!reactAgent) {
        return `Error: Agent '${subagentType}' not found. Available agents: ${Array.from(agentsMap.keys()).join(", ")}`;
      }

      try {
        // Get current state for context
        const currentState = getCurrentTaskInput<Record<string, unknown>>();

        // Modify state messages like Python does
        const modifiedState = {
          ...currentState,
          messages: [
            {
              role: "user",
              content: description,
            },
          ],
        };

        // Execute the subagent with the task
        const result = await reactAgent.invoke(modifiedState, config);

        // Use Command for state updates and navigation between agents
        // Return the result using Command to properly handle subgraph state
        return new Command({
          update: {
            files: (result as Record<string, unknown>).files || {},
            messages: [
              new ToolMessage({
                content:
                  (result.messages as Array<{ content?: string }>)?.slice(-1)[0]
                    ?.content || "Task completed",
                // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      } catch (error) {
        // Handle errors gracefully
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return new Command({
          update: {
            messages: [
              new ToolMessage({
                content: `Error executing task '${description}' with agent '${subagentType}': ${errorMessage}`,
                // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
                tool_call_id: config.toolCall?.id as string,
              }),
            ],
          },
        });
      }
    },
    {
      name: "task",
      description:
        TASK_DESCRIPTION_PREFIX.replace(
          "{other_agents}",
          subagents.map((a) => `- ${a.name}: ${a.description}`).join("\n")
        ) + TASK_DESCRIPTION_SUFFIX,
      schema: z.object({
        description: z
          .string()
          .describe("The task to execute with the selected agent"),
        subagentType: z
          .string()
          .describe(
            `Name of the agent to use. Available: ${subagents.map((a) => a.name).join(", ")}`
          ),
      }),
    }
  );
}
