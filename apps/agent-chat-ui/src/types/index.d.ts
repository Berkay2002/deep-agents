import type { Base64ContentBlock as LcBase64ContentBlock } from "@langchain/core/messages";

// Override the Base64ContentBlock type to use sourceType instead of source_type
export type Base64ContentBlock = Omit<LcBase64ContentBlock, 'source_type' | 'mime_type'> & {
  sourceType: string;
  mimeType: string;
  // biome-ignore lint: Include the original properties for compatibility with the LangChain library
  source_type?: string;
  // biome-ignore lint: Include the original properties for compatibility with the LangChain library
  mime_type?: string;
};