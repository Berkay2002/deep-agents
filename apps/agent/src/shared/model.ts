// Shared model configuration for all agents
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/** Default model parameters 
 * - Model: gemini-2.5-pro
 * - Temperature: 0.1 (low temperature for more deterministic responses)
 * - Max Output Tokens: 16384 (max tokens for response)
*/
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_OUTPUT_TOKENS = 16384;

/**
 * Creates a model instance with the specified temperature
 * @param temperature - Model temperature (default: 0.1)
 * @returns Configured model instance
 */
export function createAgentModel(temperature: number = DEFAULT_TEMPERATURE, maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS) {
  return new ChatGoogleGenerativeAI({
    model: process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-pro",
    apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GOOGLE_API_KEY,
    temperature,
    maxOutputTokens
  });
}

/**
 * Default model configurations for different agent types
 */
export const MODEL_CONFIGS = {
  "deep-research": {
    temperature: 0.1,
    model: "gemini-2.5-pro"
  },
  "code-assistant": {
    temperature: 0.0,
    model: "gemini-2.5-pro"
  },
  "general-chat": {
    temperature: 0.3,
    model: "gemini-2.5-pro"
  }
} as const;
