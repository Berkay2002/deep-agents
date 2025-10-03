// Deep Research Agent specific tools
import type { StructuredTool } from "@langchain/core/tools";
import { loadMcpTools } from "../../utils/mcp.js";
import { critiqueTools } from "./middleware/critique/index.js";
import { plannerTools } from "./middleware/planner/index.js";
import { researchTools } from "./middleware/research/index.js";
import { RESERVED_TOOL_NAMES } from "./middleware/shared/reserved-tools.js";

function sanitizeLoadedTools(tools: LoadedTool[]): LoadedTool[] {
  const seenNames = new Set<string>();
  const filtered: LoadedTool[] = [];

  for (const tool of tools) {
    const name = tool.name ?? "";
    if (name !== "" && RESERVED_TOOL_NAMES.has(name)) {
      continue;
    }
    if (name !== "") {
      if (seenNames.has(name)) {
        continue;
      }
      seenNames.add(name);
    }
    filtered.push(tool);
  }

  return filtered;
}

export type LoadedTool = StructuredTool;

/**
 * Load tools specific to research tasks
 * Includes:
 * - Research tools (exa_search, tavily_search, save_research_findings) from middleware
 * - Planner tools (topic_analysis, scope_estimation, plan_optimization) from middleware
 * - Critique tools (fact_check, evaluate_structure, analyze_completeness, save_critique) from middleware
 * - Public MCP servers (Sequential Thinking, DeepWiki)
 *
 * Note: GitHub Copilot MCP requires per-user authentication and is configured
 * separately through the UI settings
 */
export async function loadResearchTools(): Promise<LoadedTool[]> {
  const tools: LoadedTool[] = [];

  // Add refactored research tools from middleware (includes exa/tavily)
  tools.push(...researchTools);

  // Add refactored planner tools from middleware
  tools.push(...plannerTools);

  // Add refactored critique tools from middleware (NEW)
  tools.push(...critiqueTools);

  // Load public MCP servers (Sequential Thinking, DeepWiki)
  // GitHub Copilot is handled separately through UI configuration
  const mcpTools = await loadMcpTools();
  tools.push(...mcpTools);

  return sanitizeLoadedTools(tools);
}

/*
 * OLD TOOL IMPLEMENTATIONS REMOVED
 *
 * Previous implementations of exaSearch, tavilySearch have been removed.
 * Previous implementations of topicAnalysis, scopeEstimation, planOptimization
 * and all their helper functions have been removed.
 *
 * The refactored versions now:
 * - Use Command pattern for state updates
 * - Store results in mock filesystem at /research/searches/, /research/plans/, /research/findings/
 * - Have comprehensive system prompts
 * - Follow the same pattern as core deep-agent built-in tools
 *
 * Import them from:
 * - ./middleware/research/index.ts (exaSearch, tavilySearch, saveResearchFindings)
 * - ./middleware/planner/index.ts (topicAnalysis, scopeEstimation, planOptimization)
 */
