// Shared model configuration for all agents
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Creates a model instance with the specified temperature
 * @param temperature - Model temperature (default: 0.1)
 * @returns Configured model instance
 */
export function createAgentModel(temperature: number = 0.1) {
  return new ChatGoogleGenerativeAI({
    model: process.env.GOOGLE_GENAI_MODEL ?? "gemini-1.5-flash",
    apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GOOGLE_API_KEY,
    temperature,
  });
}

/**
 * Default model configurations for different agent types
 */
export const MODEL_CONFIGS = {
  "deep-research": {
    temperature: 0.1,
    model: "gemini-1.5-flash"
  },
  "code-assistant": {
    temperature: 0.0,
    model: "gemini-1.5-flash"
  },
  "general-chat": {
    temperature: 0.3,
    model: "gemini-1.5-flash"
  }
} as const;
