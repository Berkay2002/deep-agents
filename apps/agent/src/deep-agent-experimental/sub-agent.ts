/**
 * SubAgent implementation for Deep Agents
 *
 * Task tool creation and sub-agent management.
 * Creates SubAgent interface matching Python's TypedDict structure and implements
 * createTaskTool() function that creates agents map, handles tool resolution by name,
 * and returns a tool function that uses createReactAgent for sub-agents.
 */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <> */
/** biome-ignore-all lint/suspicious/noConsole: <> */

import type { LanguageModelLike } from "@langchain/core/language_models/base";
import { ToolMessage } from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { allMiddlewareTools } from "./middleware/stable.js";
import { TASK_DESCRIPTION_PREFIX, TASK_DESCRIPTION_SUFFIX } from "./prompts.js";
import { DeepAgentStateAnnotation } from "./state.js";
import type { SubAgent } from "./types.js";

const CONTENT_PREVIEW_LENGTH = 200;

const PLANNER_POINTER_PATH = "/research/plans/current_paths.json" as const;
const PLANNER_REGISTRY_PATH = "/research/plans/index.json" as const;
const SUBAGENTS_REQUIRING_PLANNER = new Set([
  "research-agent",
  "critique-agent",
]);

type PlannerPathsRecord = {
  slug: string;
  analysis: string;
  scope: string;
  plan: string;
  metadata: string;
  optimized?: string;
  dir?: string;
};

type PlannerRegistryEntry = {
  slug: string;
  topic?: string;
  context?: string;
  metadataPath: string;
  paths: PlannerPathsRecord;
  timestamps?: Record<string, string>;
  warnings?: string[];
  updatedAt: string;
};

type PlannerRegistryShape = {
  activeSlug: string;
  updatedAt: string;
  entries: Record<string, PlannerRegistryEntry>;
};

type PlannerMetadataShape = {
  topic?: string;
  context?: string;
  warnings?: unknown;
  paths?: Record<string, unknown>;
  timestamps?: unknown;
};

function safeParseJson<T>(raw: string | undefined): T | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter((value): value is string => typeof value === "string");
}

function normalizeStringRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      entries.push([key, value]);
    }
  }
  return Object.fromEntries(entries);
}

function resolvePlannerEntryFromFiles(
  files: Record<string, string>
): PlannerRegistryEntry | null {
  const pointerEntry = safeParseJson<PlannerRegistryEntry>(
    files[PLANNER_POINTER_PATH]
  );
  if (pointerEntry) {
    return pointerEntry;
  }

  const registry = safeParseJson<PlannerRegistryShape>(
    files[PLANNER_REGISTRY_PATH]
  );
  if (registry?.entries) {
    const activeEntry = registry.activeSlug
      ? registry.entries[registry.activeSlug]
      : undefined;
    if (activeEntry) {
      return activeEntry;
    }
    const fallbackEntry = Object.values(registry.entries)[0];
    if (fallbackEntry) {
      return fallbackEntry;
    }
  }

  for (const [metadataPath, metadataContent] of Object.entries(files)) {
    if (!metadataPath.endsWith("_paths.json")) {
      continue;
    }
    const entry = extractPlannerRegistryEntry(metadataPath, metadataContent);
    if (entry) {
      return entry;
    }
  }

  return null;
}

function collectMissingPlannerArtifacts(
  files: Record<string, string>,
  entry: PlannerRegistryEntry
): string[] {
  const requiredPaths = [
    entry.paths.analysis,
    entry.paths.scope,
    entry.paths.plan,
  ];
  const missing: string[] = [];
  for (const path of requiredPaths) {
    if (!(path in files)) {
      missing.push(path);
    }
  }
  return missing;
}

function ensurePlannerArtifactsAvailable(
  subagentType: string,
  existingFiles: Record<string, string>,
  config: ToolRunnableConfig
): Command | null {
  if (!SUBAGENTS_REQUIRING_PLANNER.has(subagentType)) {
    return null;
  }

  const plannerEntry = resolvePlannerEntryFromFiles(existingFiles);
  if (!plannerEntry) {
    return createMissingArtifactCommand(config, {
      error: "MissingArtifact",
      pointerPath: PLANNER_POINTER_PATH,
      reason: "planner_artifacts_unavailable",
      hint: "Invoke planner-agent with the task tool to regenerate planning artifacts before continuing.",
    });
  }

  const missingArtifacts = collectMissingPlannerArtifacts(
    existingFiles,
    plannerEntry
  );

  if (missingArtifacts.length > 0) {
    return createMissingArtifactCommand(config, {
      error: "MissingArtifact",
      slug: plannerEntry.slug,
      pointerPath: PLANNER_POINTER_PATH,
      missing: missingArtifacts,
      hint: "Re-run planner-agent to regenerate the missing files before dispatching research or critique tasks.",
    });
  }

  return null;
}

function createMissingArtifactCommand(
  config: ToolRunnableConfig,
  payload: Record<string, unknown>
): Command {
  return new Command({
    update: {
      messages: [
        new ToolMessage({
          content: JSON.stringify(payload, null, 2),
          // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
          tool_call_id: config.toolCall?.id as string,
        }),
      ],
    },
  });
}

async function runSubagentTask(params: {
  reactAgent: ReturnType<typeof createReactAgent>;
  description: string;
  subagentType: string;
  config: ToolRunnableConfig;
  currentState: Record<string, unknown>;
  existingFiles: Record<string, string>;
}): Promise<Command> {
  const {
    reactAgent,
    description,
    subagentType,
    config,
    currentState,
    existingFiles,
  } = params;

  try {
    const modifiedState = {
      ...currentState,
      messages: [
        {
          role: "user",
          content: description,
        },
      ],
    };

    const result = await reactAgent.invoke(modifiedState, config);
    const rawResult = result as {
      files?: Record<string, string>;
      messages?: Array<{ content?: string }>;
    };

    // Debug logging for file propagation
    console.log(
      `[${subagentType}] Files before merge - parent has ${Object.keys(existingFiles).length} files`
    );
    console.log(
      `[${subagentType}] Files before merge - subagent returned ${rawResult.files ? Object.keys(rawResult.files).length : 0} files`
    );
    if (rawResult.files) {
      const plannerFiles = Object.keys(rawResult.files).filter((k) =>
        k.startsWith("/research/plans/")
      );
      if (plannerFiles.length > 0) {
        console.log(
          `[${subagentType}] Planner files from subagent:`,
          plannerFiles
        );
      }
    }

    // CRITICAL FIX: Merge parent files with sub-agent files to ensure state propagation
    // Without this, planner artifacts written in sub-agent state won't be visible to
    // research-agent or critique-agent when they try to read them
    const updatedFiles = {
      ...existingFiles, // Include parent state files
      ...(rawResult.files ? { ...rawResult.files } : {}), // Overlay sub-agent updates
    };

    console.log(
      `[${subagentType}] Files after merge - total ${Object.keys(updatedFiles).length} files`
    );
    const mergedPlannerFiles = Object.keys(updatedFiles).filter((k) =>
      k.startsWith("/research/plans/")
    );
    if (mergedPlannerFiles.length > 0) {
      console.log(
        `[${subagentType}] Planner files after merge:`,
        mergedPlannerFiles
      );
    }
    const plannerPointer =
      subagentType === "planner-agent"
        ? applyPlannerArtifactsUpdate(existingFiles, updatedFiles)
        : null;

    // Verify planner artifacts were created if this was planner-agent
    if (subagentType === "planner-agent" && plannerPointer) {
      const missingAfterPlanner = collectMissingPlannerArtifacts(
        updatedFiles,
        plannerPointer
      );
      if (missingAfterPlanner.length > 0) {
        console.warn(
          `[planner-agent] Expected artifacts not found after execution: ${missingAfterPlanner.join(", ")}`
        );
      }
    }

    const lastMessageContent =
      rawResult.messages?.slice(-1)[0]?.content || "Task completed";

    // Debug logging to help diagnose empty content issues
    console.log(
      `[${subagentType}] Returned content length: ${typeof lastMessageContent === "string" ? lastMessageContent.length : 0}`
    );
    if (
      typeof lastMessageContent === "string" &&
      lastMessageContent.length > 0
    ) {
      console.log(
        `[${subagentType}] Content preview: ${lastMessageContent.substring(0, CONTENT_PREVIEW_LENGTH)}...`
      );
    } else {
      console.warn(
        `[${subagentType}] Warning: Sub-agent returned empty or non-string content`
      );
    }

    const toolMessages = [
      new ToolMessage({
        content: lastMessageContent,
        // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
        tool_call_id: config.toolCall?.id as string,
      }),
    ];

    if (plannerPointer) {
      toolMessages.push(
        new ToolMessage({
          content: JSON.stringify(
            {
              event: "planner_artifacts_registered" as const,
              pointerPath: PLANNER_POINTER_PATH,
              registryPath: PLANNER_REGISTRY_PATH,
              slug: plannerPointer.slug,
            },
            null,
            2
          ),
          // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
          tool_call_id: config.toolCall?.id as string,
        })
      );
    }

    return new Command({
      update: {
        files: updatedFiles,
        messages: toolMessages,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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
}

function extractPlannerRegistryEntry(
  metadataPath: string,
  metadataContent: string
): PlannerRegistryEntry | null {
  const metadata = safeParseJson<PlannerMetadataShape>(metadataContent);
  if (!metadata) {
    return null;
  }

  const metadataPaths = metadata.paths;
  if (!metadataPaths) {
    return null;
  }

  const paths = metadataPaths;
  if (
    typeof paths.slug !== "string" ||
    typeof paths.analysis !== "string" ||
    typeof paths.scope !== "string" ||
    typeof paths.plan !== "string" ||
    typeof paths.metadata !== "string"
  ) {
    return null;
  }

  const normalizedPaths: PlannerPathsRecord = {
    slug: paths.slug,
    analysis: paths.analysis,
    scope: paths.scope,
    plan: paths.plan,
    metadata: paths.metadata,
  };

  if (typeof paths.optimized === "string") {
    normalizedPaths.optimized = paths.optimized;
  }

  if (typeof paths.dir === "string") {
    normalizedPaths.dir = paths.dir;
  }

  const warningList = normalizeStringArray(metadata.warnings);
  const timestampRecord = normalizeStringRecord(metadata.timestamps);
  const timestamps =
    Object.keys(timestampRecord).length > 0 ? timestampRecord : undefined;
  const updatedAt = timestamps?.plan ?? new Date().toISOString();
  const warnings = warningList.length > 0 ? warningList : undefined;

  return {
    slug: normalizedPaths.slug,
    topic: typeof metadata.topic === "string" ? metadata.topic : undefined,
    context:
      typeof metadata.context === "string" ? metadata.context : undefined,
    metadataPath,
    paths: normalizedPaths,
    timestamps,
    warnings,
    updatedAt,
  };
}

function applyPlannerArtifactsUpdate(
  existingFiles: Record<string, string>,
  newFiles: Record<string, string>
): PlannerRegistryEntry | null {
  const metadataEntries = Object.entries(newFiles).filter(([path]) =>
    path.endsWith("_paths.json")
  );
  if (metadataEntries.length === 0) {
    return null;
  }

  const registrySource =
    newFiles[PLANNER_REGISTRY_PATH] ?? existingFiles[PLANNER_REGISTRY_PATH];
  const registry = safeParseJson<PlannerRegistryShape>(registrySource) ?? {
    activeSlug: "",
    updatedAt: "",
    entries: {},
  };

  if (
    !registry.entries ||
    typeof registry.entries !== "object" ||
    Array.isArray(registry.entries)
  ) {
    registry.entries = {};
  }

  let latestEntry: PlannerRegistryEntry | null = null;

  for (const [metadataPath, metadataContent] of metadataEntries) {
    const entry = extractPlannerRegistryEntry(metadataPath, metadataContent);
    if (!entry) {
      continue;
    }
    registry.entries[entry.slug] = entry;
    registry.activeSlug = entry.slug;
    registry.updatedAt = entry.updatedAt;
    latestEntry = entry;
  }

  if (!latestEntry) {
    return null;
  }

  newFiles[PLANNER_REGISTRY_PATH] = JSON.stringify(registry, null, 2);
  newFiles[PLANNER_POINTER_PATH] = JSON.stringify(latestEntry, null, 2);
  return latestEntry;
}

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
      stateSchema: DeepAgentStateAnnotation, // Required for files channel to work
    }).withConfig({ recursionLimit: 100 });

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

      const currentState = getCurrentTaskInput<Record<string, unknown>>();
      const existingFiles =
        (currentState as { files?: Record<string, string> }).files ?? {};

      const plannerGate = ensurePlannerArtifactsAvailable(
        subagentType,
        existingFiles,
        config
      );
      if (plannerGate) {
        return plannerGate;
      }

      return await runSubagentTask({
        reactAgent,
        description,
        subagentType,
        config,
        currentState,
        existingFiles,
      });
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

export const plannerArtifactUtils = {
  pointerPath: PLANNER_POINTER_PATH,
  registryPath: PLANNER_REGISTRY_PATH,
  ensurePlannerArtifactsAvailable,
  collectMissingPlannerArtifacts,
  resolvePlannerEntryFromFiles,
  applyPlannerArtifactsUpdate,
};
