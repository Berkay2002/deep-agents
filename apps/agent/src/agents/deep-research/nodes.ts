// Deep Research Agent subagents configuration
import type { SubAgent } from "deepagents";
// Planning tools are imported by name in the tools array
import {
  RESEARCH_SUB_AGENT_PROMPT,
  CRITIQUE_SUB_AGENT_PROMPT,
  PLANNER_SUB_AGENT_PROMPT,
} from "./prompts.js";

export const researchSubAgent: SubAgent = {
  name: "research-agent",
  description:
    "Used to extract raw research data for synthesis. This agent returns UNFORMATTED research findings, NOT polished reports. Only give this researcher one topic at a time. Do not pass multiple sub questions to this researcher. Instead, break down large topics into necessary components and call multiple research agents in parallel, one for each sub question. CRITICAL: The research-agent returns raw data in plain structured format (bullet points + source URLs). DO NOT echo its response to the user. DO NOT treat its response as a formatted report. ONLY use it as source material for your final_report.md. After receiving research results, mark the corresponding todo as completed and continue with remaining todos.",
  prompt: RESEARCH_SUB_AGENT_PROMPT,
  tools: ["tavily_search", "exa_search"],
};

export const critiqueSubAgent: SubAgent = {
  name: "critique-agent",
  description:
    "Used to critique the final report. Give this agent some information about how you want it to critique the report. This agent can ONLY read files and search for verification - it cannot edit or write files. CRITICAL: DO NOT echo its response to the user. DO NOT treat its response as a formatted report. ONLY use it as source material for your final_report.md.",
  prompt: CRITIQUE_SUB_AGENT_PROMPT,
  tools: ["tavily_search", "exa_search"],
  // Note: The prompt explicitly restricts to read-only operations
};

export const plannerSubAgent: SubAgent = {  
  name: "planner-agent",
  description:
    "Used to create comprehensive research plans and todo lists for complex research topics. This agent specializes in pre-research planning, topic analysis, scope estimation, and plan optimization. Use this agent when you need to break down complex research topics into structured plans. The planner-agent returns structured research plans with todo lists that can be used to guide the research process. DO NOT echo its response to the user. ONLY use its response as source material for organizing your research approach.",
  prompt: PLANNER_SUB_AGENT_PROMPT,
  tools: ["topic_analysis", "scope_estimation", "plan_optimization"],
};

export const researchSubAgents: SubAgent[] = [critiqueSubAgent, researchSubAgent, plannerSubAgent];
