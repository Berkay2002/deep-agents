import type { BuildSearchOptionsArgs } from "./types.js";

export function buildSearchOptions(
  args: BuildSearchOptionsArgs
): Record<string, unknown> {
  const contents: Record<string, unknown> = {};

  if (args.includeText) {
    contents.text = true;
  }

  if (args.includeHighlights) {
    contents.highlights = {
      query: args.highlightQuery ?? args.query,
      numSentences: args.numHighlightSentences,
    };
  }

  if (args.summaryQuery) {
    contents.summary = { query: args.summaryQuery };
  }

  const searchOptions: Record<string, unknown> = {
    numResults: args.numResults,
    type: args.type,
    livecrawl: args.livecrawl,
  };

  if (Object.keys(contents).length > 0) {
    searchOptions.contents = contents;
  }

  if (typeof args.subpages === "number" && args.subpages > 0) {
    searchOptions.subpages = args.subpages;
    if (args.subpageTargets?.length) {
      searchOptions.subpageTargets = args.subpageTargets;
    }
  }

  if (args.category) {
    searchOptions.category = args.category;
  }

  if (args.startCrawlDate) {
    searchOptions.startCrawlDate = args.startCrawlDate;
  }

  if (args.endCrawlDate) {
    searchOptions.endCrawlDate = args.endCrawlDate;
  }

  return Object.fromEntries(
    Object.entries(searchOptions).filter(([, value]) => value !== undefined)
  );
}
