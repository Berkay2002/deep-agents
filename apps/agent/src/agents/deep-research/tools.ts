// Deep Research Agent specific tools
import { type StructuredTool, tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  type ExaSearchArgs,
  exaSearchArgsSchema,
  performExaSearch,
} from "../../utils/exa.js";
import { loadMcpTools } from "../../utils/mcp.js";
import {
  performTavilySearch,
  type TavilySearchArgs,
  tavilySearchArgsSchema,
} from "../../utils/tavily.js";

export type LoadedTool = StructuredTool;

// Constants for magic numbers
const LONG_TOPIC_THRESHOLD = 100;
const COMPLEX_WORD_COUNT = 10;
const HIGH_COMPLEXITY_THRESHOLD = 3;
const LOW_COMPLEXITY_THRESHOLD = 1;
const MIN_PLAN_SIZE = 3;
const MAX_PLAN_SIZE_FOR_COMPLEXITY = 5;
const MAX_PLAN_SIZE_FOR_EFFICIENCY = 8;

// Type definitions for better type safety
type ResearchTask = {
  area: string;
  estimatedTime: number;
  priority: "high" | "medium" | "low";
};

type TopicAnalysisResult = {
  topicType: string;
  complexity: string;
  researchAreas: string[];
};

export const exaSearch = tool(
  (input: unknown) => {
    const args = input as ExaSearchArgs;
    return performExaSearch(args, { toolName: "exa_search" });
  },
  {
    name: "exa_search",
    description:
      "Perform semantic web search using Exa's neural search engine. Returns structured results with highlights, summaries, and optional full text content.",
    schema: exaSearchArgsSchema,
  }
);

export const tavilySearch = tool(
  (input: unknown) => {
    const args = input as TavilySearchArgs;
    return performTavilySearch(args, { toolName: "tavily_search" });
  },
  {
    name: "tavily_search",
    description:
      "Run a web search to find information. Returns structured Tavily search results, optional synthesized answers, and related images when requested. Always check the response for an 'error' field before using the results.",
    schema: tavilySearchArgsSchema,
  }
);

// Specialized planning tools for the planner sub-agent

const topicAnalysisArgsSchema = z.object({
  topic: z.string().describe("The research topic to analyze"),
  context: z
    .string()
    .optional()
    .describe("Additional context about the research request"),
});

export const topicAnalysis = tool(
  (input: unknown) => {
    const args = input as z.infer<typeof topicAnalysisArgsSchema>;
    // Analyze the topic complexity, type, and scope
    const { topic, context } = args;

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
      topic.length > LONG_TOPIC_THRESHOLD, // Long topics are usually complex
      topic.includes("compare"), // Comparison topics require more research
      topic.includes("analysis"), // Analysis requires depth
      topic.includes("comprehensive"), // Explicitly asking for comprehensive coverage
      topic.split(" ").length > COMPLEX_WORD_COUNT, // Many words suggest complexity
    ];

    const complexityScore = complexityIndicators.filter(Boolean).length;
    if (complexityScore >= HIGH_COMPLEXITY_THRESHOLD) {
      complexity = "high";
    } else if (complexityScore <= LOW_COMPLEXITY_THRESHOLD) {
      complexity = "low";
    }

    return {
      topicType,
      complexity,
      estimatedResearchAreas: estimateResearchAreas(topic, topicType),
      suggestedSources: getSuggestedSources(topicType),
      estimatedTimeframe: getEstimatedTimeframe(complexity, topicType),
    };
  },
  {
    name: "topic_analysis",
    description:
      "Analyze a research topic to determine its type, complexity, and suggested research approach",
    schema: topicAnalysisArgsSchema,
  }
);

const scopeEstimationArgsSchema = z.object({
  topic: z.string().describe("The research topic"),
  topicType: z
    .string()
    .describe(
      "The type of topic (technical, academic, business, creative, general)"
    ),
  complexity: z.string().describe("The complexity level (low, medium, high)"),
  researchAreas: z.array(z.string()).describe("Key areas that need research"),
});

export const scopeEstimation = tool(
  (input: unknown) => {
    const args = input as z.infer<typeof scopeEstimationArgsSchema>;
    const { topicType, complexity, researchAreas } = args;

    // Estimate research scope based on topic characteristics
    const baseTimeframes = {
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

    const estimatedHours =
      baseTimeframes[complexity as keyof typeof baseTimeframes][
        topicType as keyof typeof baseTimeframes.low
      ];
    const researchTasks = researchAreas.map((area) => ({
      area,
      estimatedTime: Math.ceil(estimatedHours / researchAreas.length),
      priority: getPriority(area, topicType),
    }));

    return {
      estimatedTotalHours: estimatedHours,
      researchTasks,
      suggestedMilestones: generateMilestones(researchTasks),
      resourceRequirements: getResourceRequirements(topicType, complexity),
    };
  },
  {
    name: "scope_estimation",
    description:
      "Estimate the scope, timeframe, and resource requirements for a research project",
    schema: scopeEstimationArgsSchema,
  }
);

const planOptimizationArgsSchema = z.object({
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
});

export const planOptimization = tool(
  (input: unknown) => {
    const args = input as z.infer<typeof planOptimizationArgsSchema>;
    const { currentPlan, userFeedback, topicAnalysis: analysisResult } = args;

    let optimizedPlan = [...currentPlan];

    // Apply user feedback if provided
    if (userFeedback) {
      optimizedPlan = applyUserFeedback(optimizedPlan, userFeedback);
    }

    // Optimize based on topic analysis
    optimizedPlan = optimizePlanForTopic(optimizedPlan, analysisResult);

    // Identify potential gaps
    const gaps = identifyGaps(optimizedPlan, analysisResult);

    return {
      optimizedPlan,
      identifiedGaps: gaps,
      suggestionsForImprovement: generateSuggestions(
        optimizedPlan,
        analysisResult
      ),
      estimatedImprovement: calculateImprovement(currentPlan, optimizedPlan),
    };
  },
  {
    name: "plan_optimization",
    description:
      "Optimize a research plan based on user feedback and topic analysis",
    schema: planOptimizationArgsSchema,
  }
);

// Helper functions for the planning tools
function estimateResearchAreas(_topic: string, topicType: string): string[] {
  const commonAreas = [
    "background research",
    "current state analysis",
    "key findings",
  ];

  const typeSpecificAreas = {
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

  return [
    ...commonAreas,
    ...(typeSpecificAreas[topicType as keyof typeof typeSpecificAreas] ||
      typeSpecificAreas.general),
  ];
}

function getSuggestedSources(topicType: string): string[] {
  const sourceMap = {
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

  return sourceMap[topicType as keyof typeof sourceMap] || sourceMap.general;
}

function getEstimatedTimeframe(complexity: string, topicType: string): string {
  const hours = {
    low: { technical: 2, academic: 3, business: 2, creative: 2, general: 2 },
    medium: { technical: 4, academic: 6, business: 4, creative: 3, general: 3 },
    high: { technical: 8, academic: 10, business: 6, creative: 5, general: 5 },
  };

  return `${hours[complexity as keyof typeof hours][topicType as keyof typeof hours.low]} hours`;
}

function getPriority(
  area: string,
  topicType: string
): "high" | "medium" | "low" {
  const highPriorityAreas = {
    technical: ["technical documentation", "implementation examples"],
    academic: ["literature review", "methodology analysis"],
    business: ["market analysis", "competitive landscape"],
    creative: ["design principles", "current trends"],
    general: ["background research", "overview"],
  };

  return highPriorityAreas[
    topicType as keyof typeof highPriorityAreas
  ]?.includes(area)
    ? "high"
    : "medium";
}

function generateMilestones(researchTasks: ResearchTask[]): string[] {
  return researchTasks.map(
    (task, index) => `Milestone ${index + 1}: Complete research on ${task.area}`
  );
}

function getResourceRequirements(
  topicType: string,
  complexity: string
): Record<string, string | string[]> {
  return {
    searchTools:
      topicType === "technical"
        ? ["technical docs", "code repositories"]
        : ["general web search"],
    timeAllocation: complexity === "high" ? "extended" : "standard",
    expertiseLevel: topicType === "academic" ? "expert" : "intermediate",
  };
}

function applyUserFeedback(plan: string[], feedback: string): string[] {
  // Simple feedback application logic
  if (feedback.toLowerCase().includes("more detail")) {
    return plan.map((task) => `${task} (detailed research)`);
  }
  if (feedback.toLowerCase().includes("less")) {
    return plan.slice(0, Math.max(MIN_PLAN_SIZE, plan.length - 2));
  }
  return plan;
}

function optimizePlanForTopic(
  plan: string[],
  analysisResult: TopicAnalysisResult
): string[] {
  // Reorder plan based on topic type priorities
  const { topicType } = analysisResult;

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

function identifyGaps(
  plan: string[],
  analysisResult: TopicAnalysisResult
): string[] {
  const gaps: string[] = [];
  const { researchAreas } = analysisResult;

  // Check if all research areas are covered
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

function generateSuggestions(
  plan: string[],
  analysisResult: TopicAnalysisResult
): string[] {
  const suggestions: string[] = [];
  const { complexity } = analysisResult;

  if (complexity === "high" && plan.length < MAX_PLAN_SIZE_FOR_COMPLEXITY) {
    suggestions.push(
      "Consider breaking down complex topics into more specific sub-tasks"
    );
  }

  if (plan.length > MAX_PLAN_SIZE_FOR_EFFICIENCY) {
    suggestions.push("Consider grouping related tasks to improve efficiency");
  }

  return suggestions;
}

function calculateImprovement(
  originalPlan: string[],
  optimizedPlan: string[]
): string {
  const improvements: string[] = [];

  if (optimizedPlan.length > originalPlan.length) {
    improvements.push("Added comprehensive coverage");
  }

  if (optimizedPlan.length < originalPlan.length) {
    improvements.push("Streamlined for efficiency");
  }

  return improvements.join(", ") || "Refined based on topic analysis";
}

/**
 * Load tools specific to research tasks
 * Includes public MCP servers (Sequential Thinking, DeepWiki)
 * Note: GitHub Copilot MCP requires per-user authentication and is configured
 * separately through the UI settings
 */
export async function loadResearchTools(): Promise<LoadedTool[]> {
  const tools: LoadedTool[] = [];

  if (process.env.EXA_API_KEY) {
    tools.push(exaSearch as LoadedTool);
  }
  // Note: EXA_API_KEY not set - the exa_search tool will be unavailable

  if (process.env.TAVILY_API_KEY) {
    tools.push(tavilySearch as LoadedTool);
  }
  // Note: TAVILY_API_KEY not set - the tavily_search tool will be unavailable

  // Add specialized planning tools
  tools.push(
    topicAnalysis as LoadedTool,
    scopeEstimation as LoadedTool,
    planOptimization as LoadedTool
  );

  // Load public MCP servers (Sequential Thinking, DeepWiki)
  // GitHub Copilot is handled separately through UI configuration
  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return tools;
}
