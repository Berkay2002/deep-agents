// Deep Research Agent subagents configuration
import type { SubAgent } from "deepagents";
import {
  RESEARCH_SUB_AGENT_PROMPT,
  CRITIQUE_SUB_AGENT_PROMPT,
} from "./prompts.js";

export const researchSubAgent: SubAgent = {
  name: "research-agent",
  description:
    "Used to research more in depth questions. Only give this researcher one topic at a time. Do not pass multiple sub questions to this researcher. Instead, you should break down a large topic into the necessary components, and then call multiple research agents in parallel, one for each sub question. IMPORTANT: The research-agent's response is an intermediate result - after receiving it, mark the corresponding todo as completed and continue with remaining todos. Do not treat the research-agent's response as your final answer to the user.",
  prompt: RESEARCH_SUB_AGENT_PROMPT,
  tools: ["internet_search"],
};

export const critiqueSubAgent: SubAgent = {
  name: "critique-agent",
  description:
    "Used to critique the final report. Give this agent some information about how you want it to critique the report.",
  prompt: CRITIQUE_SUB_AGENT_PROMPT,
};

export const researchSubAgents: SubAgent[] = [critiqueSubAgent, researchSubAgent];
