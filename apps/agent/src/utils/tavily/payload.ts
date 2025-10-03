import type { BuildTavilyPayloadArgs } from "./types.js";

export function buildRequestPayload(
  apiKey: string,
  args: BuildTavilyPayloadArgs
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  payload.api_key = apiKey;
  payload.query = args.query;
  payload.max_results = args.maxResults;
  payload.topic = args.topic;
  payload.include_raw_content = args.includeRawContent;
  payload.search_depth = args.searchDepth;
  payload.include_answer = args.includeAnswer;
  payload.include_images = args.includeImages;
  payload.include_image_descriptions = args.includeImageDescriptions;
  payload.days = args.days;
  payload.include_domains = args.includeDomains;
  payload.exclude_domains = args.excludeDomains;
  payload.language = args.language;
  payload.location = args.location;

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}
