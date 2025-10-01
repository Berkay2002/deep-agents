// Deep Research Agent specific tools
import { tool, type StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { loadMcpTools } from "../../utils/mcp.js";
import {
  performExaSearch,
  exaSearchArgsSchema,
  type ExaSearchArgs,
} from "../../utils/exa.js";
import {
  performTavilySearch,
  tavilySearchArgsSchema,
  type TavilySearchArgs,
} from "../../utils/tavily.js";

export type LoadedTool = StructuredTool;

export const exaSearch = tool(
  async (args: ExaSearchArgs) =>
    performExaSearch(args, { toolName: "exa_search" }),
  {
    name: "exa_search",
    description:
      "Perform semantic web search using Exa's neural search engine. Returns structured results with highlights, summaries, and optional full text content.",
    schema: exaSearchArgsSchema,
  }
);

export const tavilySearch = tool(
  async (args: TavilySearchArgs) =>
    performTavilySearch(args, { toolName: "tavily_search" }),
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
  context: z.string().optional().describe("Additional context about the research request"),
});

export const topicAnalysis = tool(
  async (args: z.infer<typeof topicAnalysisArgsSchema>) => {
    // Analyze the topic complexity, type, and scope
    const { topic, context } = args;
    
    // Topic classification logic
    const technicalKeywords = ['api', 'code', 'programming', 'software', 'technology', 'framework', 'library', 'algorithm'];
    const academicKeywords = ['research', 'study', 'analysis', 'theory', 'methodology', 'academic', 'scholarly'];
    const businessKeywords = ['business', 'market', 'industry', 'company', 'strategy', 'revenue', 'profit'];
    const creativeKeywords = ['design', 'art', 'creative', 'aesthetic', 'style', 'visual'];
    
    const topicLower = topic.toLowerCase() + ' ' + (context || '').toLowerCase();
    
    let topicType = 'general';
    let complexity = 'medium';
    
    // Determine topic type
    if (technicalKeywords.some(keyword => topicLower.includes(keyword))) {
      topicType = 'technical';
    } else if (academicKeywords.some(keyword => topicLower.includes(keyword))) {
      topicType = 'academic';
    } else if (businessKeywords.some(keyword => topicLower.includes(keyword))) {
      topicType = 'business';
    } else if (creativeKeywords.some(keyword => topicLower.includes(keyword))) {
      topicType = 'creative';
    }
    
    // Estimate complexity based on various factors
    const complexityIndicators = [
      topic.length > 100, // Long topics are usually complex
      topic.includes('compare'), // Comparison topics require more research
      topic.includes('analysis'), // Analysis requires depth
      topic.includes('comprehensive'), // Explicitly asking for comprehensive coverage
      topic.split(' ').length > 10 // Many words suggest complexity
    ];
    
    const complexityScore = complexityIndicators.filter(Boolean).length;
    if (complexityScore >= 3) {
      complexity = 'high';
    } else if (complexityScore <= 1) {
      complexity = 'low';
    }
    
    return {
      topicType,
      complexity,
      estimatedResearchAreas: estimateResearchAreas(topic, topicType),
      suggestedSources: getSuggestedSources(topicType),
      estimatedTimeframe: getEstimatedTimeframe(complexity, topicType)
    };
  },
  {
    name: "topic_analysis",
    description: "Analyze a research topic to determine its type, complexity, and suggested research approach",
    schema: topicAnalysisArgsSchema,
  }
);

const scopeEstimationArgsSchema = z.object({
  topic: z.string().describe("The research topic"),
  topicType: z.string().describe("The type of topic (technical, academic, business, creative, general)"),
  complexity: z.string().describe("The complexity level (low, medium, high)"),
  researchAreas: z.array(z.string()).describe("Key areas that need research"),
});

export const scopeEstimation = tool(
  async (args: z.infer<typeof scopeEstimationArgsSchema>) => {
    const { topicType, complexity, researchAreas } = args;
    
    // Estimate research scope based on topic characteristics
    const baseTimeframes = {
      low: { technical: 2, academic: 3, business: 2, creative: 2, general: 2 },
      medium: { technical: 4, academic: 6, business: 4, creative: 3, general: 3 },
      high: { technical: 8, academic: 10, business: 6, creative: 5, general: 5 }
    };
    
    const estimatedHours = baseTimeframes[complexity as keyof typeof baseTimeframes][topicType as keyof typeof baseTimeframes.low];
    const researchTasks = researchAreas.map(area => ({
      area,
      estimatedTime: Math.ceil(estimatedHours / researchAreas.length),
      priority: getPriority(area, topicType)
    }));
    
    return {
      estimatedTotalHours: estimatedHours,
      researchTasks,
      suggestedMilestones: generateMilestones(researchTasks),
      resourceRequirements: getResourceRequirements(topicType, complexity)
    };
  },
  {
    name: "scope_estimation",
    description: "Estimate the scope, timeframe, and resource requirements for a research project",
    schema: scopeEstimationArgsSchema,
  }
);

const planOptimizationArgsSchema = z.object({
  currentPlan: z.array(z.string()).describe("The current research plan as an array of tasks"),
  userFeedback: z.string().optional().describe("User feedback on the current plan"),
  topicAnalysis: z.object({
    topicType: z.string(),
    complexity: z.string(),
    researchAreas: z.array(z.string())
  }).describe("Topic analysis results"),
});

export const planOptimization = tool(
  async (args: z.infer<typeof planOptimizationArgsSchema>) => {
    const { currentPlan, userFeedback, topicAnalysis } = args;
    
    let optimizedPlan = [...currentPlan];
    
    // Apply user feedback if provided
    if (userFeedback) {
      optimizedPlan = applyUserFeedback(optimizedPlan, userFeedback);
    }
    
    // Optimize based on topic analysis
    optimizedPlan = optimizePlanForTopic(optimizedPlan, topicAnalysis);
    
    // Identify potential gaps
    const gaps = identifyGaps(optimizedPlan, topicAnalysis);
    
    return {
      optimizedPlan,
      identifiedGaps: gaps,
      suggestionsForImprovement: generateSuggestions(optimizedPlan, topicAnalysis),
      estimatedImprovement: calculateImprovement(currentPlan, optimizedPlan)
    };
  },
  {
    name: "plan_optimization",
    description: "Optimize a research plan based on user feedback and topic analysis",
    schema: planOptimizationArgsSchema,
  }
);

// Helper functions for the planning tools
function estimateResearchAreas(_topic: string, topicType: string): string[] {
  const commonAreas = ['background research', 'current state analysis', 'key findings'];
  
  const typeSpecificAreas = {
    technical: ['technical documentation', 'implementation examples', 'best practices'],
    academic: ['literature review', 'methodology analysis', 'theoretical framework'],
    business: ['market analysis', 'competitive landscape', 'trend analysis'],
    creative: ['design principles', 'current trends', 'case studies'],
    general: ['overview', 'key aspects', 'examples']
  };
  
  return [...commonAreas, ...(typeSpecificAreas[topicType as keyof typeof typeSpecificAreas] || typeSpecificAreas.general)];
}

function getSuggestedSources(topicType: string): string[] {
  const sourceMap = {
    technical: ['technical documentation', 'API references', 'code repositories', 'technical blogs'],
    academic: ['academic journals', 'research papers', 'scholarly databases', 'institutional sources'],
    business: ['industry reports', 'market research', 'company publications', 'business news'],
    creative: ['design portfolios', 'industry publications', 'case studies', 'trend reports'],
    general: ['general web search', 'encyclopedias', 'news sources', 'expert opinions']
  };
  
  return sourceMap[topicType as keyof typeof sourceMap] || sourceMap.general;
}

function getEstimatedTimeframe(complexity: string, topicType: string): string {
  const hours = {
    low: { technical: 2, academic: 3, business: 2, creative: 2, general: 2 },
    medium: { technical: 4, academic: 6, business: 4, creative: 3, general: 3 },
    high: { technical: 8, academic: 10, business: 6, creative: 5, general: 5 }
  };
  
  return `${hours[complexity as keyof typeof hours][topicType as keyof typeof hours.low]} hours`;
}

function getPriority(area: string, topicType: string): 'high' | 'medium' | 'low' {
  const highPriorityAreas = {
    technical: ['technical documentation', 'implementation examples'],
    academic: ['literature review', 'methodology analysis'],
    business: ['market analysis', 'competitive landscape'],
    creative: ['design principles', 'current trends'],
    general: ['background research', 'overview']
  };
  
  return highPriorityAreas[topicType as keyof typeof highPriorityAreas]?.includes(area) ? 'high' : 'medium';
}

function generateMilestones(researchTasks: any[]): string[] {
  return researchTasks.map((task, index) => 
    `Milestone ${index + 1}: Complete research on ${task.area}`
  );
}

function getResourceRequirements(topicType: string, complexity: string): object {
  return {
    searchTools: topicType === 'technical' ? ['technical docs', 'code repositories'] : ['general web search'],
    timeAllocation: complexity === 'high' ? 'extended' : 'standard',
    expertiseLevel: topicType === 'academic' ? 'expert' : 'intermediate'
  };
}

function applyUserFeedback(plan: string[], feedback: string): string[] {
  // Simple feedback application logic
  if (feedback.toLowerCase().includes('more detail')) {
    return plan.map(task => task + ' (detailed research)');
  }
  if (feedback.toLowerCase().includes('less')) {
    return plan.slice(0, Math.max(3, plan.length - 2));
  }
  return plan;
}

function optimizePlanForTopic(plan: string[], topicAnalysis: any): string[] {
  // Reorder plan based on topic type priorities
  const { topicType } = topicAnalysis;
  
  if (topicType === 'technical') {
    // Move technical tasks to the front
    return plan.sort((a, b) => {
      const aTechnical = a.toLowerCase().includes('technical') || a.toLowerCase().includes('documentation');
      const bTechnical = b.toLowerCase().includes('technical') || b.toLowerCase().includes('documentation');
      return bTechnical ? 1 : aTechnical ? -1 : 0;
    });
  }
  
  return plan;
}

function identifyGaps(plan: string[], topicAnalysis: any): string[] {
  const gaps: string[] = [];
  const { researchAreas } = topicAnalysis;
  
  // Check if all research areas are covered
  researchAreas.forEach((area: string) => {
    const covered = plan.some(task => task.toLowerCase().includes(area.toLowerCase()));
    if (!covered) {
      gaps.push(`Missing coverage for: ${area}`);
    }
  });
  
  return gaps;
}

function generateSuggestions(plan: string[], topicAnalysis: any): string[] {
  const suggestions: string[] = [];
  const { complexity } = topicAnalysis;
  
  if (complexity === 'high' && plan.length < 5) {
    suggestions.push('Consider breaking down complex topics into more specific sub-tasks');
  }
  
  if (plan.length > 8) {
    suggestions.push('Consider grouping related tasks to improve efficiency');
  }
  
  return suggestions;
}

function calculateImprovement(originalPlan: string[], optimizedPlan: string[]): string {
  const improvements: string[] = [];
  
  if (optimizedPlan.length > originalPlan.length) {
    improvements.push('Added comprehensive coverage');
  }
  
  if (optimizedPlan.length < originalPlan.length) {
    improvements.push('Streamlined for efficiency');
  }
  
  return improvements.join(', ') || 'Refined based on topic analysis';
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
  } else {
    console.warn(
      "EXA_API_KEY not set. The exa_search tool will be unavailable."
    );
  }

  if (process.env.TAVILY_API_KEY) {
    tools.push(tavilySearch as LoadedTool);
  } else {
    console.warn(
      "TAVILY_API_KEY not set. The tavily_search tool will be unavailable."
    );
  }
  // Add specialized planning tools
  tools.push(topicAnalysis as LoadedTool, scopeEstimation as LoadedTool, planOptimization as LoadedTool);

  // Load public MCP servers (Sequential Thinking, DeepWiki)
  // GitHub Copilot is handled separately through UI configuration
  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return tools;
}
