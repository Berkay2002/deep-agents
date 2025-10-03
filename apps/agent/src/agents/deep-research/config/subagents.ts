import type { SubAgent } from "../../../deep-agent-experimental/types.js";
import {
  CRITIQUE_SUB_AGENT_PROMPT,
  PLANNER_SUB_AGENT_PROMPT,
  RESEARCH_SUB_AGENT_PROMPT,
} from "../prompts/index.js";

export const researchSubAgent: SubAgent = {
  name: "research-agent",
  description:
    "Used to extract raw research data for synthesis. This agent returns UNFORMATTED research findings, NOT polished reports. Only give this researcher one topic at a time. Do not pass multiple sub questions to this researcher. Instead, break down large topics into necessary components and call multiple research agents in parallel, one for each sub question. CRITICAL: The research-agent returns raw data in plain structured format (bullet points + source URLs). DO NOT echo its response to the user. DO NOT treat its response as a formatted report. ONLY use it as source material for your final_report.md. After receiving research results, mark the corresponding todo as completed and continue with remaining todos.",
  prompt: RESEARCH_SUB_AGENT_PROMPT,
  tools: [
    "tavily_search", // Refactored with Command pattern
    "exa_search", // Refactored with Command pattern
    "save_research_findings", // Structure findings
    "ls", // List mock filesystem
    "read_file", // Read cached searches/findings
    "write_file", // Write custom artifacts
    "edit_file", // Edit existing artifacts
  ],
};

export const critiqueSubAgent: SubAgent = {
  name: "critique-agent",
  description:
    "Used to critique the final report using specialized critique tools. This agent performs structured analysis of report structure, completeness, accuracy, and clarity. It can fact-check claims, evaluate organization, analyze coverage, and save structured critique findings. The agent outputs STRUCTURED CRITIQUE DATA for synthesis by the main agent. CRITICAL: DO NOT echo its response to the user. DO NOT treat its response as a formatted report. ONLY use it as source material for improving your final_report.md.",
  prompt: CRITIQUE_SUB_AGENT_PROMPT,
  tools: [
    "tavily_search", // For manual fact-checking
    "exa_search", // For manual fact-checking
    "fact_check", // Automated fact verification
    "evaluate_structure", // Structure analysis
    "analyze_completeness", // Completeness assessment
    "save_critique", // Save structured critique
    "ls", // List mock filesystem
    "read_file", // Read cached searches/findings
    "write_file", // Write custom artifacts
    "edit_file", // Edit existing artifacts
  ],
};

export const plannerSubAgent: SubAgent = {
  name: "planner-agent",
  description:
    "Used to create comprehensive research plans and todo lists for complex research topics. This agent specializes in pre-research planning, topic analysis, scope estimation, and plan optimization. Use this agent when you need to break down complex research topics into structured plans. The planner-agent returns structured research plans with todo lists that can be used to guide the research process. DO NOT echo its response to the user. ONLY use its response as source material for organizing your research approach.",
  prompt: PLANNER_SUB_AGENT_PROMPT,
  tools: [
    "compose_plan",
    "topic_analysis",
    "scope_estimation",
    "plan_optimization",
    "ls",
    "read_file",
    "write_file",
    "edit_file",
    "write_todos",
  ],
};

export const researchSubAgents: SubAgent[] = [
  critiqueSubAgent,
  researchSubAgent,
  plannerSubAgent,
];
