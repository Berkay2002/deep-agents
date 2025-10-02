/**
 * Model configuration for Deep Agents
 *
 * Default model configuration using Google Gemini.
 * Returns a ChatGoogleGenerativeAI instance configured with gemini-2.5-pro and maxOutputTokens: 16384.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LanguageModelLike } from "./types.js";

/**
 * Get the default model for Deep Agents
 *
 * Returns a ChatGoogleGenerativeAI instance configured with:
 * - model: "gemini-2.5-pro"
 * - maxOutputTokens: 16384
 *
 * @returns ChatGoogleGenerativeAI instance with default configuration
 */
export function getDefaultModel(): LanguageModelLike {
  return new ChatGoogleGenerativeAI({
    model: process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-pro",
    apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GOOGLE_API_KEY,
    maxOutputTokens: 16384,
  });
}
