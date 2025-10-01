// Deep Research Agent subagents configuration
import type { SubAgent } from "deepagents";
import {
  RESEARCH_SUB_AGENT_PROMPT,
  CRITIQUE_SUB_AGENT_PROMPT,
} from "./prompts.js";

export const researchSubAgent: SubAgent = {
  name: "research-agent",
  description:
    "Used to extract raw research data for synthesis. This agent returns UNFORMATTED research findings, NOT polished reports. Only give this researcher one topic at a time. Do not pass multiple sub questions to this researcher. Instead, break down large topics into necessary components and call multiple research agents in parallel, one for each sub question. CRITICAL: The research-agent returns raw data in plain structured format (bullet points + source URLs). DO NOT echo its response to the user. DO NOT treat its response as a formatted report. ONLY use it as source material for your final_report.md. After receiving research results, mark the corresponding todo as completed and continue with remaining todos.",
  prompt: RESEARCH_SUB_AGENT_PROMPT,
  // No tools specified = gets ALL available tools (internet_search + all MCP tools)
};

export const critiqueSubAgent: SubAgent = {
  name: "critique-agent",
  description:
    "Used to critique the final report. Give this agent some information about how you want it to critique the report. This agent can ONLY read files and search for verification - it cannot edit or write files. CRITICAL: DO NOT echo its response to the user. DO NOT treat its response as a formatted report. ONLY use it as source material for your final_report.md.",
  prompt: CRITIQUE_SUB_AGENT_PROMPT,
  // No tools specified = gets ALL available tools (includes read_file, internet_search, MCP tools)
  // Note: The prompt explicitly restricts to read-only operations
};

export const researchSubAgents: SubAgent[] = [critiqueSubAgent, researchSubAgent];
