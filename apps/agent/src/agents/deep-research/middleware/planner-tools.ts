/**
 * Planner-specific middleware tools for Deep Research Agent
 *
 * Follows the same architectural pattern as core deep-agent built-in tools:
 * - Uses Command pattern for state updates
 * - Stores results in mock filesystem (state.files)
 * - Comprehensive system prompts and tool descriptions
 * - Automatic state propagation to parent agents
 */
/** biome-ignore-all lint/suspicious/noConsole: <Need console logs for debugging> */
/** biome-ignore-all lint/style/noUnusedTemplateLiteral: <Need template literals for multi-line strings> */
/** biome-ignore-all lint/correctness/noUnusedImports: <Its fine> */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <It's okay to have some complexity here> */

// biome-ignore assist/source/organizeImports: <It's okay to keep imports as is for clarity>
import { ToolMessage } from "@langchain/core/messages";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import type { DeepAgentStateType } from "../../../deep-agent-experimental/types.js";
import { plannerPaths } from "./planner-paths.js";
import type { PlannerPaths } from "./planner-paths.js";
import {
  buildInitialPlan,
  type InitialPlanDocument,
  type ScopeDocument,
  type TopicAnalysisDocument,
} from "./plan-writer.js";

/**
 * System prompt for planner tools - similar to TODO_SYSTEM_PROMPT and FS_SYSTEM_PROMPT
 */
export const PLANNER_SYSTEM_PROMPT = `## Research Planning Tools: \`topic_analysis\`, \`scope_estimation\`, \`plan_optimization\`

You have access to specialized research planning tools that help analyze topics, estimate scope, and optimize research plans.

**Mock Filesystem Structure:**
All planning artifacts are stored in the mock filesystem at \`/research/plans/\`:
- \`/research/plans/{topic}_analysis.json\` - Topic analysis results
- \`/research/plans/{topic}_scope.json\` - Scope estimation and milestones
- \`/research/plans/{topic}_plan.json\` - Research plan
- \`/research/plans/{topic}_plan_optimized.json\` - Optimized plan after feedback

**Workflow:**
1. Use \`topic_analysis\` to classify and analyze the research topic
2. Use \`scope_estimation\` to break down timeframes, tasks, and resources
3. Use \`plan_optimization\` to refine plans based on feedback
4. Use \`read_file\` to access stored analyses and plans
5. Use \`write_file\` to create or update plans directly
6. Use \`edit_file\` to make specific changes to existing plans

**Built-in Tools Available:**
- \`ls\` - List files in mock filesystem (use \`ls /research/plans/\` to see all analyses)
- \`read_file\` - Read analysis, scope, or plan files
- \`write_file\` - Create new plans or research artifacts
- \`edit_file\` - Edit existing plans with precise string replacements
- \`write_todos\` - Manage todo lists for tracking research tasks

These planning tools automatically store results in the mock filesystem, making them accessible to all agents in the system.`;

/**
 * Detailed description for topic_analysis tool
 */
export const TOPIC_ANALYSIS_DESCRIPTION = `Analyze a research topic to determine its type, complexity, scope, and recommended approach.

**When to Use:**
- At the start of every new research task
- When you need to understand topic characteristics before planning
- To determine appropriate research strategies and sources

**Output:**
Stores analysis results in \`/research/plans/{sanitized_topic}_analysis.json\` with:
- \`topicType\`: Classification (technical/academic/business/creative/general)
- \`complexity\`: Difficulty level (low/medium/high)
- \`researchAreas\`: Key areas that need investigation
- \`suggestedSources\`: Recommended source types for this topic
- \`estimatedComplexity\`: Research complexity assessment (impacts task breakdown)
- \`timestamp\`: When analysis was performed

**Usage Pattern:**
1. Call \`topic_analysis\` with the research topic
2. Use \`read_file\` to read the stored analysis
3. Use analysis results to guide \`scope_estimation\` and planning

**Example:**
\`\`\`
topic_analysis({ topic: "AI agent architectures", context: "comparison study" })
→ Stores: /research/plans/ai_agent_architectures_analysis.json
read_file({ filePath: "/research/plans/ai_agent_architectures_analysis.json" })
→ Returns: Full analysis with classification and recommendations
\`\`\`

The analysis file persists across agent turns and is accessible to all agents in the hierarchy.`;

/**
 * Detailed description for scope_estimation tool
 */
export const SCOPE_ESTIMATION_DESCRIPTION = `Decompose research into structured tasks, milestones, and resource requirements.

**When to Use:**
- After completing \`topic_analysis\`
- When you need to break down research into actionable tasks
- To identify required tools and resources for research execution

**Input:**
Requires topic analysis data. Read from \`/research/plans/{topic}_analysis.json\` first or provide as input.

**Output:**
Stores estimation results in \`/research/plans/{sanitized_topic}_scope.json\` with:
- \`researchTasks\`: Array of tasks with priorities and dependencies
- \`suggestedMilestones\`: Milestone definitions for tracking progress
- \`resourceRequirements\`: Tools, search APIs, and capabilities needed
- \`taskCount\`: Total number of research tasks
- \`timestamp\`: When estimation was performed

**Usage Pattern:**
1. Read topic analysis: \`read_file({ filePath: "/research/plans/{topic}_analysis.json" })\`
2. Call \`scope_estimation\` with topic and analysis data
3. Use \`read_file\` to read the stored scope estimation
4. Convert scope tasks into todo items using \`write_todos\`

**Example:**
\`\`\`
// After topic_analysis has been run
scope_estimation({
  topic: "AI agent architectures",
  topicType: "technical",
  complexity: "high",
  researchAreas: ["background", "implementations", "comparisons"]
})
→ Stores: /research/plans/ai_agent_architectures_scope.json
\`\`\`

Use the scope file to create structured research plans and todo lists.`;

/**
 * Detailed description for plan_optimization tool
 */
export const PLAN_OPTIMIZATION_DESCRIPTION = `Optimize a research plan based on user feedback, gaps, or topic analysis.

**When to Use:**
- After receiving user feedback on initial plan
- When identified gaps need to be addressed
- To refine and improve existing research plans

**Input:**
- Current plan (array of research tasks)
- Optional user feedback
- Topic analysis data

**Output:**
Stores optimized plan in \`/research/plans/{sanitized_topic}_plan_optimized.json\` with:
- \`optimizedPlan\`: Improved task list with better ordering and coverage
- \`identifiedGaps\`: Missing areas or coverage gaps
- \`suggestionsForImprovement\`: Specific recommendations
- \`estimatedImprovement\`: Description of optimizations made
- \`timestamp\`: When optimization was performed

**Usage Pattern:**
1. Read current plan: \`read_file({ filePath: "/research/plans/{topic}_plan.json" })\`
2. Read topic analysis: \`read_file({ filePath: "/research/plans/{topic}_analysis.json" })\`
3. Call \`plan_optimization\` with plan, feedback, and analysis
4. Use \`read_file\` to read the optimized plan
5. Apply improvements to your research workflow

**Example:**
\`\`\`
plan_optimization({
  currentPlan: ["Research background", "Find examples", "Compare approaches"],
  userFeedback: "Need more depth on implementation details",
  topicAnalysis: { topicType: "technical", complexity: "high", ... }
})
→ Stores: /research/plans/{topic}_plan_optimized.json
\`\`\`

The optimization maintains plan structure while addressing feedback and filling gaps.`;

// Constants for magic numbers
const LONG_TOPIC_THRESHOLD = 100;
const COMPLEX_WORD_COUNT = 10;
const HIGH_COMPLEXITY_THRESHOLD = 3;
const LOW_COMPLEXITY_THRESHOLD = 1;
const DEFAULT_HOURS_FALLBACK = 3;

type FileStore = Record<string, string>;

type PlannerArtifactMetadata = {
  analysis?: {
    path: string;
    timestamp: string;
  };
  scope?: {
    path: string;
    timestamp: string;
    taskCount: number;
    milestoneCount: number;
  };
  plan?: {
    path: string;
    timestamp: string;
    taskCount: number;
    milestoneCount: number;
  };
  optimized?: {
    path: string;
    timestamp: string;
    identifiedGaps: number;
    suggestions: number;
    estimatedImprovement: string;
  };
};

type PlannerMetadata = {
  topic: string;
  context?: string;
  originalSlug: string;
  truncated: boolean;
  warnings: string[];
  paths: PlannerPaths;
  timestamps: {
    analysis?: string;
    scope?: string;
    plan?: string;
    optimized?: string;
  };
  artifacts: PlannerArtifactMetadata;
};

function uniqueWarnings(...lists: Array<string[] | undefined>): string[] {
  const merged = lists.flatMap((list) => list ?? []);
  return Array.from(new Set(merged));
}

function getPlannerMetadata(
  files: FileStore,
  paths: PlannerPaths
): PlannerMetadata | null {
  const raw = files[paths.metadata];
  if (typeof raw !== "string") {
    return null;
  }
  try {
    return JSON.parse(raw) as PlannerMetadata;
  } catch {
    return null;
  }
}

function writePlannerMetadata(
  files: FileStore,
  paths: PlannerPaths,
  metadata: PlannerMetadata
) {
  files[paths.metadata] = JSON.stringify(metadata, null, 2);
}
/**
 * Helper function to estimate research areas based on topic type
 */
function estimateResearchAreas(_topic: string, topicType: string): string[] {
  const commonAreas = [
    "background research",
    "current state analysis",
    "key findings",
  ];

  const typeSpecificAreas: Record<string, string[]> = {
    technical: [
      "technical documentation",
      "implementation examples",
      "best practices",
    ],
    academic: [
      "literature review",
      "methodology analysis",
      "theoretical framework",
    ],
    business: ["market analysis", "competitive landscape", "trend analysis"],
    creative: ["design principles", "current trends", "case studies"],
    general: ["overview", "key aspects", "examples"],
  };

  const specificAreas =
    typeSpecificAreas[topicType] ?? typeSpecificAreas.general ?? [];
  return [...commonAreas, ...specificAreas];
}

/**
 * Helper function to get suggested sources based on topic type
 */
function getSuggestedSources(topicType: string): string[] {
  const sourceMap: Record<string, string[]> = {
    technical: [
      "technical documentation",
      "API references",
      "code repositories",
      "technical blogs",
    ],
    academic: [
      "academic journals",
      "research papers",
      "scholarly databases",
      "institutional sources",
    ],
    business: [
      "industry reports",
      "market research",
      "company publications",
      "business news",
    ],
    creative: [
      "design portfolios",
      "industry publications",
      "case studies",
      "trend reports",
    ],
    general: [
      "general web search",
      "encyclopedias",
      "news sources",
      "expert opinions",
    ],
  };

  return sourceMap[topicType] ?? sourceMap.general ?? [];
}

/**
 * Helper function to estimate timeframe
 */
function getEstimatedTimeframe(complexity: string, topicType: string): string {
  const hours: Record<string, Record<string, number>> = {
    low: { technical: 2, academic: 3, business: 2, creative: 2, general: 2 },
    medium: {
      technical: 4,
      academic: 6,
      business: 4,
      creative: 3,
      general: 3,
    },
    high: {
      technical: 8,
      academic: 10,
      business: 6,
      creative: 5,
      general: 5,
    },
  };

  const complexityHours = hours[complexity] ?? hours.medium;
  const timeHours =
    complexityHours?.[topicType] ??
    complexityHours?.general ??
    DEFAULT_HOURS_FALLBACK;

  return `${timeHours} hours`;
}

const TOPIC_TYPE_KEYWORDS: Record<string, string[]> = {
  technical: [
    "api",
    "code",
    "programming",
    "software",
    "technology",
    "framework",
    "library",
    "algorithm",
  ],
  academic: [
    "research",
    "study",
    "analysis",
    "theory",
    "methodology",
    "academic",
    "scholarly",
  ],
  business: [
    "business",
    "market",
    "industry",
    "company",
    "strategy",
    "revenue",
    "profit",
  ],
  creative: ["design", "art", "creative", "aesthetic", "style", "visual"],
};

const HIGH_PRIORITY_AREA_MAP: Record<string, string[]> = {
  technical: ["technical documentation", "implementation examples"],
  academic: ["literature review", "methodology analysis"],
  business: ["market analysis", "competitive landscape"],
  creative: ["design principles", "current trends"],
  general: ["background research", "overview"],
};

const BASE_SCOPE_TIMEFRAMES: Record<string, Record<string, number>> = {
  low: { technical: 2, academic: 3, business: 2, creative: 2, general: 2 },
  medium: {
    technical: 4,
    academic: 6,
    business: 4,
    creative: 3,
    general: 3,
  },
  high: {
    technical: 8,
    academic: 10,
    business: 6,
    creative: 5,
    general: 5,
  },
};

function determineAreaPriority(
  area: string,
  topicType: string
): "high" | "medium" | "low" {
  return HIGH_PRIORITY_AREA_MAP[topicType]?.includes(area) ? "high" : "medium";
}

function detectTopicType(topicLower: string): string {
  const {
    technical = [],
    academic = [],
    business = [],
    creative = [],
  } = TOPIC_TYPE_KEYWORDS;

  if (technical.some((keyword) => topicLower.includes(keyword))) {
    return "technical";
  }
  if (academic.some((keyword) => topicLower.includes(keyword))) {
    return "academic";
  }
  if (business.some((keyword) => topicLower.includes(keyword))) {
    return "business";
  }
  if (creative.some((keyword) => topicLower.includes(keyword))) {
    return "creative";
  }
  return "general";
}

function determineTopicComplexity(topic: string): "low" | "medium" | "high" {
  const complexityIndicators = [
    topic.length > LONG_TOPIC_THRESHOLD,
    topic.includes("compare"),
    topic.includes("analysis"),
    topic.includes("comprehensive"),
    topic.split(" ").length > COMPLEX_WORD_COUNT,
  ];

  const complexityScore = complexityIndicators.filter(Boolean).length;
  if (complexityScore >= HIGH_COMPLEXITY_THRESHOLD) {
    return "high";
  }
  if (complexityScore <= LOW_COMPLEXITY_THRESHOLD) {
    return "low";
  }
  return "medium";
}

function createTopicAnalysisDocument(params: {
  topic: string;
  context?: string;
}): TopicAnalysisDocument {
  const { topic, context } = params;
  const topicLower = `${topic.toLowerCase()} ${(context ?? "").toLowerCase()}`;
  const topicType = detectTopicType(topicLower);
  const complexity = determineTopicComplexity(topic);
  return {
    topic,
    context: context ?? "",
    topicType,
    complexity,
    researchAreas: estimateResearchAreas(topic, topicType),
    suggestedSources: getSuggestedSources(topicType),
    estimatedTimeframe: getEstimatedTimeframe(complexity, topicType),
    timestamp: new Date().toISOString(),
  };
}

function createScopeDocument(params: {
  topic: string;
  topicType: string;
  complexity: string;
  researchAreas: string[];
}): ScopeDocument {
  const { topic, topicType, complexity, researchAreas } = params;
  const complexityTimeframes =
    BASE_SCOPE_TIMEFRAMES[complexity] ?? BASE_SCOPE_TIMEFRAMES.medium;
  const estimatedHours =
    complexityTimeframes?.[topicType] ??
    complexityTimeframes?.general ??
    DEFAULT_HOURS_FALLBACK;

  const taskAreas =
    researchAreas.length > 0 ? researchAreas : ["General research overview"];
  const perTaskEstimate = Math.ceil(
    (estimatedHours ?? 0) / Math.max(taskAreas.length, 1)
  );
  const researchTasks = taskAreas.map((area) => ({
    area,
    estimatedTime: perTaskEstimate,
    priority: determineAreaPriority(area, topicType),
  }));

  const suggestedMilestones = researchTasks.map(
    (task, index) => `Milestone ${index + 1}: Complete research on ${task.area}`
  );

  const resourceRequirements = {
    searchTools:
      topicType === "technical"
        ? ["technical docs", "code repositories"]
        : ["general web search"],
    timeAllocation: complexity === "high" ? "extended" : "standard",
    expertiseLevel: topicType === "academic" ? "expert" : "intermediate",
  };

  return {
    topic,
    estimatedTotalHours: estimatedHours ?? 0,
    researchTasks,
    suggestedMilestones,
    resourceRequirements,
    timestamp: new Date().toISOString(),
  };
}

function updatePlannerMetadata(params: {
  files: FileStore;
  paths: PlannerPaths;
  analysis: TopicAnalysisDocument;
  scope: ScopeDocument;
  plan: InitialPlanDocument;
}): void {
  const { files, paths, analysis, scope, plan } = params;
  const existingMetadata = getPlannerMetadata(files, paths);
  const truncationWarnings = paths.truncated
    ? [`Slug truncated to ${paths.slug} (max ${paths.maxLength} characters)`]
    : [];
  const contextValue = existingMetadata?.context ?? analysis.context ?? "";

  const metadata: PlannerMetadata = {
    topic: analysis.topic,
    context: contextValue,
    originalSlug: paths.originalSlug,
    truncated: paths.truncated,
    warnings: uniqueWarnings(existingMetadata?.warnings, truncationWarnings),
    paths,
    timestamps: {
      ...existingMetadata?.timestamps,
      analysis: existingMetadata?.timestamps?.analysis ?? analysis.timestamp,
      scope: scope.timestamp,
      plan: plan.metadata.createdAt,
    },
    artifacts: {
      ...existingMetadata?.artifacts,
      analysis:
        existingMetadata?.artifacts?.analysis ??
        ({
          path: paths.analysis,
          timestamp: analysis.timestamp,
        } satisfies PlannerArtifactMetadata["analysis"]),
      scope: {
        path: paths.scope,
        timestamp: scope.timestamp,
        taskCount: scope.researchTasks.length,
        milestoneCount: scope.suggestedMilestones.length,
      },
      plan: {
        path: paths.plan,
        timestamp: plan.metadata.createdAt,
        taskCount: plan.tasks.length,
        milestoneCount: plan.milestones.length,
      },
    },
  };

  writePlannerMetadata(files, paths, metadata);
}

/**
 * Topic analysis tool - analyzes research topic and stores in mock filesystem
 */
export const topicAnalysis = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files: FileStore = { ...(state.files || {}) };
    const { topic, context } = input as { topic: string; context?: string };

    const analysisResult = createTopicAnalysisDocument({ topic, context });

    const paths = plannerPaths(topic);
    files[paths.analysis] = JSON.stringify(analysisResult, null, 2);

    const existingMetadata = getPlannerMetadata(files, paths);
    const contextValue =
      analysisResult.context && analysisResult.context.trim().length > 0
        ? analysisResult.context
        : existingMetadata?.context;
    const truncationWarnings = paths.truncated
      ? [`Slug truncated to ${paths.slug} (max ${paths.maxLength} characters)`]
      : [];

    const metadata: PlannerMetadata = {
      topic,
      context: contextValue,
      originalSlug: paths.originalSlug,
      truncated: paths.truncated,
      warnings: uniqueWarnings(existingMetadata?.warnings, truncationWarnings),
      paths,
      timestamps: {
        ...existingMetadata?.timestamps,
        analysis: analysisResult.timestamp,
      },
      artifacts: {
        ...existingMetadata?.artifacts,
        analysis: {
          path: paths.analysis,
          timestamp: analysisResult.timestamp,
        },
      },
    };
    writePlannerMetadata(files, paths, metadata);

    const payload = {
      event: "topic_analysis_saved" as const,
      topic,
      path: paths.analysis,
      metadataPath: paths.metadata,
      paths,
      summary: {
        topicType: analysisResult.topicType,
        complexity: analysisResult.complexity,
        estimatedTimeframe: analysisResult.estimatedTimeframe,
        researchAreas: analysisResult.researchAreas,
        suggestedSources: analysisResult.suggestedSources,
        context: analysisResult.context,
      },
      timestamp: analysisResult.timestamp,
    };

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: JSON.stringify(payload, null, 2),
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "topic_analysis",
    description: TOPIC_ANALYSIS_DESCRIPTION,
    schema: z.object({
      topic: z.string().describe("The research topic to analyze"),
      context: z
        .string()
        .optional()
        .describe("Additional context about the research request"),
    }),
  }
);

/**
 * Scope estimation tool - estimates research scope and stores in mock filesystem
 */
export const scopeEstimation = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files: FileStore = { ...(state.files || {}) };
    const { topic, topicType, complexity, researchAreas } = input as {
      topic: string;
      topicType: string;
      complexity: string;
      researchAreas: string[];
    };

    const scopeResult = createScopeDocument({
      topic,
      topicType,
      complexity,
      researchAreas,
    });

    const paths = plannerPaths(topic);
    const analysisContent = files[paths.analysis];

    let analysisDocument: TopicAnalysisDocument;
    if (analysisContent !== undefined) {
      try {
        analysisDocument = JSON.parse(analysisContent) as TopicAnalysisDocument;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown analysis parse error";
        throw new Error(
          `Failed to parse topic analysis at ${paths.analysis}: ${message}`
        );
      }
    } else {
      const timestamp = new Date().toISOString();
      analysisDocument = {
        topic,
        context: "",
        topicType,
        complexity,
        researchAreas,
        suggestedSources: getSuggestedSources(topicType),
        estimatedTimeframe: getEstimatedTimeframe(complexity, topicType),
        timestamp,
      };
      files[paths.analysis] = JSON.stringify(analysisDocument, null, 2);
    }

    files[paths.scope] = JSON.stringify(scopeResult, null, 2);

    const initialPlan = buildInitialPlan({
      paths,
      analysis: analysisDocument,
      scope: scopeResult,
    });
    files[paths.plan] = JSON.stringify(initialPlan, null, 2);

    updatePlannerMetadata({
      files,
      paths,
      analysis: analysisDocument,
      scope: scopeResult,
      plan: initialPlan,
    });

    const scopePayload = {
      event: "scope_estimation_saved" as const,
      topic,
      path: paths.scope,
      metadataPath: paths.metadata,
      paths,
      summary: {
        estimatedTotalHours: scopeResult.estimatedTotalHours,
        taskCount: scopeResult.researchTasks.length,
        milestoneCount: scopeResult.suggestedMilestones.length,
      },
      timestamp: scopeResult.timestamp,
    };

    const planPayload = {
      event: "initial_plan_written" as const,
      topic,
      path: paths.plan,
      metadataPath: paths.metadata,
      paths,
      taskCount: initialPlan.tasks.length,
      milestoneCount: initialPlan.milestones.length,
      workflow: initialPlan.workflow,
      metadata: initialPlan.metadata,
    };

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: JSON.stringify(scopePayload, null, 2),
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
          new ToolMessage({
            content: JSON.stringify(planPayload, null, 2),
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "scope_estimation",
    description: SCOPE_ESTIMATION_DESCRIPTION,
    schema: z.object({
      topic: z.string().describe("The research topic"),
      topicType: z
        .string()
        .describe(
          "The type of topic (technical, academic, business, creative, general)"
        ),
      complexity: z
        .string()
        .describe("The complexity level (low, medium, high)"),
      researchAreas: z
        .array(z.string())
        .describe("Key areas that need research"),
    }),
  }
);

export const composePlan = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files: FileStore = { ...(state.files || {}) };
    const { topic, context } = input as { topic: string; context?: string };

    const paths = plannerPaths(topic);
    const analysisDocument = createTopicAnalysisDocument({ topic, context });
    files[paths.analysis] = JSON.stringify(analysisDocument, null, 2);

    const scopeResult = createScopeDocument({
      topic,
      topicType: analysisDocument.topicType,
      complexity: analysisDocument.complexity,
      researchAreas: analysisDocument.researchAreas,
    });
    files[paths.scope] = JSON.stringify(scopeResult, null, 2);

    const initialPlan = buildInitialPlan({
      paths,
      analysis: analysisDocument,
      scope: scopeResult,
    });
    files[paths.plan] = JSON.stringify(initialPlan, null, 2);

    updatePlannerMetadata({
      files,
      paths,
      analysis: analysisDocument,
      scope: scopeResult,
      plan: initialPlan,
    });

    // Debug logging to trace file creation
    console.log(
      `[compose_plan] Creating planner artifacts for topic: "${topic}"`
    );
    console.log(`[compose_plan] Files created:`, {
      analysis: paths.analysis,
      scope: paths.scope,
      plan: paths.plan,
      metadata: paths.metadata,
    });
    console.log(
      `[compose_plan] Total files in state: ${Object.keys(files).length}`
    );
    console.log(
      `[compose_plan] File keys:`,
      Object.keys(files).filter((k) => k.startsWith("/research/plans/"))
    );

    const payload = {
      event: "compose_plan_completed" as const,
      topic,
      metadataPath: paths.metadata,
      paths,
      summary: {
        topicType: analysisDocument.topicType,
        complexity: analysisDocument.complexity,
        estimatedTimeframe: analysisDocument.estimatedTimeframe,
        taskCount: scopeResult.researchTasks.length,
        milestoneCount: scopeResult.suggestedMilestones.length,
      },
      artifacts: {
        analysisPath: paths.analysis,
        scopePath: paths.scope,
        planPath: paths.plan,
      },
      timestamp: initialPlan.metadata.createdAt,
    };

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: JSON.stringify(payload, null, 2),
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "compose_plan",
    description:
      "Generate topic analysis, scope estimation, and initial research plan in a single step.",
    schema: z.object({
      topic: z.string().describe("The research topic to analyze and plan"),
      context: z
        .string()
        .optional()
        .describe("Additional context about the research request"),
    }),
  }
);

/**
 * Plan optimization tool - optimizes research plan and stores in mock filesystem
 */
// Helper function to apply user feedback to plan
function applyUserFeedback(plan: string[], feedback?: string): string[] {
  if (!feedback) {
    return plan;
  }

  const minPlanSize = 3;
  let updatedPlan = [...plan];

  if (feedback.toLowerCase().includes("more detail")) {
    updatedPlan = updatedPlan.map((task) => `${task} (detailed research)`);
  } else if (feedback.toLowerCase().includes("less")) {
    updatedPlan = updatedPlan.slice(
      0,
      Math.max(minPlanSize, updatedPlan.length - 2)
    );
  }

  return updatedPlan;
}

// Helper function to optimize plan based on topic type
function optimizePlanByTopicType(plan: string[], topicType: string): string[] {
  if (topicType === "technical") {
    // Move technical tasks to the front
    return plan.sort((a, b) => {
      const aTechnical =
        a.toLowerCase().includes("technical") ||
        a.toLowerCase().includes("documentation");
      const bTechnical =
        b.toLowerCase().includes("technical") ||
        b.toLowerCase().includes("documentation");

      if (bTechnical) {
        return 1;
      }
      if (aTechnical) {
        return -1;
      }
      return 0;
    });
  }
  return plan;
}

// Helper function to identify gaps in research coverage
function identifyGaps(plan: string[], researchAreas: string[]): string[] {
  const gaps: string[] = [];
  for (const area of researchAreas) {
    const covered = plan.some((task) =>
      task.toLowerCase().includes(area.toLowerCase())
    );
    if (!covered) {
      gaps.push(`Missing coverage for: ${area}`);
    }
  }
  return gaps;
}

// Helper function to generate optimization suggestions
function generateSuggestions(plan: string[], complexity: string): string[] {
  const suggestions: string[] = [];
  const maxPlanSizeForComplexity = 5;
  const maxPlanSizeForEfficiency = 8;

  if (complexity === "high" && plan.length < maxPlanSizeForComplexity) {
    suggestions.push(
      "Consider breaking down complex topics into more specific sub-tasks"
    );
  }
  if (plan.length > maxPlanSizeForEfficiency) {
    suggestions.push("Consider grouping related tasks to improve efficiency");
  }

  return suggestions;
}

// Helper function to calculate improvement description
function calculateImprovement(
  optimizedPlan: string[],
  originalPlan: string[]
): string {
  const improvements: string[] = [];
  if (optimizedPlan.length > originalPlan.length) {
    improvements.push("Added comprehensive coverage");
  }
  if (optimizedPlan.length < originalPlan.length) {
    improvements.push("Streamlined for efficiency");
  }
  return improvements.length > 0
    ? improvements.join(", ")
    : "Refined based on topic analysis";
}

export const planOptimization = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files: FileStore = { ...(state.files || {}) };
    const {
      topic,
      currentPlan,
      userFeedback,
      topicAnalysis: analysisData,
    } = input as {
      topic: string;
      currentPlan: string[];
      userFeedback?: string;
      topicAnalysis: {
        topicType: string;
        complexity: string;
        researchAreas: string[];
      };
    };

    let optimizedPlan = [...currentPlan];

    // Apply user feedback if provided
    optimizedPlan = applyUserFeedback(optimizedPlan, userFeedback);

    // Optimize based on topic type
    const { topicType } = analysisData;
    optimizedPlan = optimizePlanByTopicType(optimizedPlan, topicType);

    // Identify gaps
    const { researchAreas } = analysisData;
    const gaps = identifyGaps(optimizedPlan, researchAreas);

    // Generate suggestions
    const { complexity } = analysisData;
    const suggestions = generateSuggestions(optimizedPlan, complexity);

    // Calculate improvement
    const estimatedImprovement = calculateImprovement(
      optimizedPlan,
      currentPlan
    );

    const optimizationResult = {
      topic,
      originalPlan: currentPlan,
      optimizedPlan,
      identifiedGaps: gaps,
      suggestionsForImprovement: suggestions,
      estimatedImprovement,
      userFeedback: userFeedback || null,
      timestamp: new Date().toISOString(),
    };

    // Store in mock filesystem
    const paths = plannerPaths(topic);
    files[paths.optimized] = JSON.stringify(optimizationResult, null, 2);

    const existingMetadata = getPlannerMetadata(files, paths);
    const truncationWarnings = paths.truncated
      ? [`Slug truncated to ${paths.slug} (max ${paths.maxLength} characters)`]
      : [];
    const metadata: PlannerMetadata = {
      topic: existingMetadata?.topic ?? topic,
      context: existingMetadata?.context,
      originalSlug: paths.originalSlug,
      truncated: paths.truncated,
      warnings: uniqueWarnings(existingMetadata?.warnings, truncationWarnings),
      paths,
      timestamps: {
        ...existingMetadata?.timestamps,
        optimized: optimizationResult.timestamp,
      },
      artifacts: {
        ...existingMetadata?.artifacts,
        optimized: {
          path: paths.optimized,
          timestamp: optimizationResult.timestamp,
          identifiedGaps: gaps.length,
          suggestions: suggestions.length,
          estimatedImprovement,
        },
      },
    };
    writePlannerMetadata(files, paths, metadata);

    const payload = {
      event: "plan_optimized" as const,
      topic,
      path: paths.optimized,
      metadataPath: paths.metadata,
      paths,
      summary: {
        identifiedGaps: gaps.length,
        suggestions: suggestions.length,
        estimatedImprovement,
      },
      timestamp: optimizationResult.timestamp,
    };

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: JSON.stringify(payload, null, 2),
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "plan_optimization",
    description: PLAN_OPTIMIZATION_DESCRIPTION,
    schema: z.object({
      topic: z.string().describe("The research topic"),
      currentPlan: z
        .array(z.string())
        .describe("The current research plan as an array of tasks"),
      userFeedback: z
        .string()
        .optional()
        .describe("User feedback on the current plan"),
      topicAnalysis: z
        .object({
          topicType: z.string(),
          complexity: z.string(),
          researchAreas: z.array(z.string()),
        })
        .describe("Topic analysis results"),
    }),
  }
);

/**
 * Planner tools collection
 */
export const plannerTools = [
  composePlan,
  topicAnalysis,
  scopeEstimation,
  planOptimization,
];

/**
 * Message modifier for adding planner system prompts
 */
export const plannerMessageModifier = (message: string) =>
  message + PLANNER_SYSTEM_PROMPT;
