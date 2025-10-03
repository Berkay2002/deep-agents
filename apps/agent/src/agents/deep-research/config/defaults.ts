import type { AgentConfig } from "../../../shared/types.js";

export const defaultDeepResearchConfig: AgentConfig = {
  name: "deep-research",
  description: "Expert researcher for in-depth analysis and report generation",
  capabilities: [
    "Web research and analysis",
    "Report writing and synthesis",
    "Academic research methodology",
    "Multi-source information gathering",
    "Citation and source management",
    "Comparative analysis",
    "Topic exploration and breakdown",
  ],
  temperature: 0.1,
};
