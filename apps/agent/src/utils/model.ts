import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const DEFAULT_MODEL_NAME = "gemini-2.5-pro";
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.25;

export function createAgentModel() {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY ?? "",
    model: process.env.GOOGLE_GENAI_MODEL ?? DEFAULT_MODEL_NAME,
    temperature: DEFAULT_TEMPERATURE,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
  });
}