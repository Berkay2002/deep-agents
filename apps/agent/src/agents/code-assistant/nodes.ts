// Code Assistant Agent subagents configuration
import type { SubAgent } from "deepagents";
import {
  CODE_ANALYZER_PROMPT,
  BUG_FIXER_PROMPT,
  CODE_GENERATOR_PROMPT,
} from "./prompts.js";

export const codeAnalyzerSubAgent: SubAgent = {
  name: "code-analyzer",
  description: "Analyzes code structure, patterns, and potential issues. Use for code review, architecture analysis, and quality assessment.",
  prompt: CODE_ANALYZER_PROMPT,
  tools: ["internet_search"], // Can search for best practices, patterns, etc.
};

export const bugFixerSubAgent: SubAgent = {
  name: "bug-fixer",
  description: "Identifies and fixes bugs in code. Use when debugging issues or when code is not working as expected.",
  prompt: BUG_FIXER_PROMPT,
  tools: ["internet_search"], // Can search for solutions, error explanations, etc.
};

export const codeGeneratorSubAgent: SubAgent = {
  name: "code-generator",
  description: "Generates new code based on specifications. Use when creating new functions, classes, or entire modules.",
  prompt: CODE_GENERATOR_PROMPT,
  tools: ["internet_search"], // Can search for examples, documentation, etc.
};

export const codeSubAgents: SubAgent[] = [
  codeAnalyzerSubAgent,
  bugFixerSubAgent,
  codeGeneratorSubAgent,
];
