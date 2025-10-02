declare module "exa-js" {
  type ExaSubpage = {
    title?: string;
    url: string;
    text?: string;
    highlights?: unknown[];
    summary?: unknown;
  };

  type ExaResult = ExaSubpage & {
    author?: string;
    publishedDate?: string;
    subpages?: ExaSubpage[];
  };

  type ExaSearchResponse = {
    results: ExaResult[];
  };

  export default class Exa {
    constructor(apiKey: string);

    searchAndContents(
      query: string,
      options?: Record<string, unknown>
    ): Promise<ExaSearchResponse>;
  }
}
