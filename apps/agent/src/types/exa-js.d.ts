declare module "exa-js" {
  interface ExaSubpage {
    title?: string;
    url: string;
    text?: string;
    highlights?: unknown[];
    summary?: unknown;
  }

  interface ExaResult extends ExaSubpage {
    author?: string;
    publishedDate?: string;
    subpages?: ExaSubpage[];
  }

  interface ExaSearchResponse {
    results: ExaResult[];
  }

  export default class Exa {
    constructor(apiKey: string);

    searchAndContents(
      query: string,
      options?: Record<string, unknown>
    ): Promise<ExaSearchResponse>;
  }
}
