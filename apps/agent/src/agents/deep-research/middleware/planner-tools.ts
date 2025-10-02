/**
 * Planner-specific middleware tools for Deep Research Agent
 *
 * Follows the same architectural pattern as core deep-agent built-in tools:
 * - Uses Command pattern for state updates
 * - Stores results in mock filesystem (state.files)
 * - Comprehensive system prompts and tool descriptions
 * - Automatic state propagation to parent agents
 */

import { ToolMessage } from "@langchain/core/messages";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import type { DeepAgentStateType } from "../../../deep-agent-experimental/types.js";

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
- \`estimatedTimeframe\`: Projected research duration
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
export const SCOPE_ESTIMATION_DESCRIPTION = `Estimate the scope, timeframe, milestones, and resource requirements for a research project.

**When to Use:**
- After completing \`topic_analysis\`
- When you need to break down research into actionable tasks
- To estimate time and resource requirements

**Input:**
Requires topic analysis data. Read from \`/research/plans/{topic}_analysis.json\` first or provide as input.

**Output:**
Stores estimation results in \`/research/plans/{sanitized_topic}_scope.json\` with:
- \`estimatedTotalHours\`: Total projected research time
- \`researchTasks\`: Array of tasks with priorities and time estimates
- \`suggestedMilestones\`: Milestone definitions for tracking progress
- \`resourceRequirements\`: Tools, expertise, and resources needed
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
const MAX_FILENAME_LENGTH = 50;

/**
 * Helper function to sanitize topic for filesystem paths
 */
function sanitizeTopicForPath(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, MAX_FILENAME_LENGTH); // Limit length for reasonable filenames
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

/**
 * Topic analysis tool - analyzes research topic and stores in mock filesystem
 */
export const topicAnalysis = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { topic, context } = input as { topic: string; context?: string };

    // Topic classification logic
    const technicalKeywords = [
      "api",
      "code",
      "programming",
      "software",
      "technology",
      "framework",
      "library",
      "algorithm",
    ];
    const academicKeywords = [
      "research",
      "study",
      "analysis",
      "theory",
      "methodology",
      "academic",
      "scholarly",
    ];
    const businessKeywords = [
      "business",
      "market",
      "industry",
      "company",
      "strategy",
      "revenue",
      "profit",
    ];
    const creativeKeywords = [
      "design",
      "art",
      "creative",
      "aesthetic",
      "style",
      "visual",
    ];

    const topicLower = `${topic.toLowerCase()} ${(context || "").toLowerCase()}`;

    let topicType = "general";
    let complexity = "medium";

    // Determine topic type
    if (technicalKeywords.some((keyword) => topicLower.includes(keyword))) {
      topicType = "technical";
    } else if (
      academicKeywords.some((keyword) => topicLower.includes(keyword))
    ) {
      topicType = "academic";
    } else if (
      businessKeywords.some((keyword) => topicLower.includes(keyword))
    ) {
      topicType = "business";
    } else if (
      creativeKeywords.some((keyword) => topicLower.includes(keyword))
    ) {
      topicType = "creative";
    }

    // Estimate complexity based on various factors
    const complexityIndicators = [
      topic.length > LONG_TOPIC_THRESHOLD,
      topic.includes("compare"),
      topic.includes("analysis"),
      topic.includes("comprehensive"),
      topic.split(" ").length > COMPLEX_WORD_COUNT,
    ];

    const complexityScore = complexityIndicators.filter(Boolean).length;
    if (complexityScore >= HIGH_COMPLEXITY_THRESHOLD) {
      complexity = "high";
    } else if (complexityScore <= LOW_COMPLEXITY_THRESHOLD) {
      complexity = "low";
    }

    // Generate analysis result
    const analysisResult = {
      topic,
      context: context || "",
      topicType,
      complexity,
      researchAreas: estimateResearchAreas(topic, topicType),
      suggestedSources: getSuggestedSources(topicType),
      estimatedTimeframe: getEstimatedTimeframe(complexity, topicType),
      timestamp: new Date().toISOString(),
    };

    // Store in mock filesystem
    const sanitizedTopic = sanitizeTopicForPath(topic);
    const filePath = `/research/plans/${sanitizedTopic}_analysis.json`;
    files[filePath] = JSON.stringify(analysisResult, null, 2);

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Topic analysis completed and saved to ${filePath}

Analysis Summary:
- Topic Type: ${topicType}
- Complexity: ${complexity}
- Estimated Timeframe: ${getEstimatedTimeframe(complexity, topicType)}
- Research Areas: ${analysisResult.researchAreas.join(", ")}

Use read_file to access the full analysis: read_file({ filePath: "${filePath}" })`,
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
    const files = { ...(state.files || {}) };
    const { topic, topicType, complexity, researchAreas } = input as {
      topic: string;
      topicType: string;
      complexity: string;
      researchAreas: string[];
    };

    // Estimate research scope based on topic characteristics
    const baseTimeframes: Record<string, Record<string, number>> = {
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

    const complexityTimeframes =
      baseTimeframes[complexity] ?? baseTimeframes.medium;
    const estimatedHours =
      complexityTimeframes?.[topicType] ??
      complexityTimeframes?.general ??
      DEFAULT_HOURS_FALLBACK;

    // Helper function to get priority
    function getPriority(
      area: string,
      type: string
    ): "high" | "medium" | "low" {
      const highPriorityAreas: Record<string, string[]> = {
        technical: ["technical documentation", "implementation examples"],
        academic: ["literature review", "methodology analysis"],
        business: ["market analysis", "competitive landscape"],
        creative: ["design principles", "current trends"],
        general: ["background research", "overview"],
      };

      return highPriorityAreas[type]?.includes(area) ? "high" : "medium";
    }

    // Generate research tasks
    const researchTasks = researchAreas.map((area) => ({
      area,
      estimatedTime: Math.ceil((estimatedHours ?? 0) / researchAreas.length),
      priority: getPriority(area, topicType),
    }));

    // Generate milestones
    const suggestedMilestones = researchTasks.map(
      (task, index) =>
        `Milestone ${index + 1}: Complete research on ${task.area}`
    );

    // Determine resource requirements
    const resourceRequirements = {
      searchTools:
        topicType === "technical"
          ? ["technical docs", "code repositories"]
          : ["general web search"],
      timeAllocation: complexity === "high" ? "extended" : "standard",
      expertiseLevel: topicType === "academic" ? "expert" : "intermediate",
    };

    const scopeResult = {
      topic,
      estimatedTotalHours: estimatedHours ?? 0,
      researchTasks,
      suggestedMilestones,
      resourceRequirements,
      timestamp: new Date().toISOString(),
    };

    // Store in mock filesystem
    const sanitizedTopic = sanitizeTopicForPath(topic);
    const filePath = `/research/plans/${sanitizedTopic}_scope.json`;
    files[filePath] = JSON.stringify(scopeResult, null, 2);

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Scope estimation completed and saved to ${filePath}

Scope Summary:
- Estimated Total Hours: ${estimatedHours ?? 0}
- Research Tasks: ${researchTasks.length} tasks
- Milestones: ${suggestedMilestones.length}

Use read_file to access the full scope: read_file({ filePath: "${filePath}" })`,
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
    const files = { ...(state.files || {}) };
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
    const sanitizedTopic = sanitizeTopicForPath(topic);
    const filePath = `/research/plans/${sanitizedTopic}_plan_optimized.json`;
    files[filePath] = JSON.stringify(optimizationResult, null, 2);

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Plan optimization completed and saved to ${filePath}

Optimization Summary:
- Identified Gaps: ${gaps.length}
- Suggestions: ${suggestions.length}
- Improvement: ${estimatedImprovement}

Use read_file to access the full optimized plan: read_file({ filePath: "${filePath}" })`,
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
export const plannerTools = [topicAnalysis, scopeEstimation, planOptimization];

/**
 * Message modifier for adding planner system prompts
 */
export const plannerMessageModifier = (message: string) =>
  message + PLANNER_SYSTEM_PROMPT;
