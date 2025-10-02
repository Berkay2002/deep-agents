/**
 * Model configuration for Deep Agents
 *
 * Provides default model configuration and model utilities.
 */

import type { LanguageModelLike } from "@langchain/core/language_models/base";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Get the default model for Deep Agents
 * Returns Google Gemini 2.5 Pro as the default model
 */
export function getDefaultModel(): LanguageModelLike {
  return new ChatGoogleGenerativeAI({
    model: process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-pro",
    apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GOOGLE_API_KEY,
    temperature: 0.1,
    maxOutputTokens: 16_384,
  });
}
