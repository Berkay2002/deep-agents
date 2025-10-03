import { z } from "zod";

const PLANNER_DIR = "/research/plans" as const;
const MAX_TOPIC_FILENAME_LENGTH = 60;

export const plannerPathsSchema = z.object({
  slug: z.string(),
  originalSlug: z.string(),
  dir: z.string(),
  analysis: z.string(),
  scope: z.string(),
  plan: z.string(),
  optimized: z.string(),
  metadata: z.string(),
  truncated: z.boolean(),
  maxLength: z.number().positive(),
});

export type PlannerPaths = z.infer<typeof plannerPathsSchema>;

type PlannerPathOptions = {
  directory?: string;
  maxLength?: number;
};

function normalizeTopic(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function truncateSlug(
  slug: string,
  maxLength: number
): {
  truncatedSlug: string;
  wasTruncated: boolean;
} {
  if (slug.length <= maxLength) {
    return { truncatedSlug: slug, wasTruncated: false };
  }
  return {
    truncatedSlug: slug.slice(0, maxLength),
    wasTruncated: true,
  };
}

export function plannerPaths(
  rawTopic: string,
  options: PlannerPathOptions = {}
): PlannerPaths {
  const directory = options.directory ?? PLANNER_DIR;
  const maxLength = options.maxLength ?? MAX_TOPIC_FILENAME_LENGTH;
  const normalized = normalizeTopic(rawTopic);
  const effectiveSlug = normalized.length === 0 ? "topic" : normalized;
  const { truncatedSlug, wasTruncated } = truncateSlug(
    effectiveSlug,
    maxLength
  );

  const base = `${directory}/${truncatedSlug}`;

  const paths: PlannerPaths = {
    slug: truncatedSlug,
    originalSlug: effectiveSlug,
    dir: directory,
    analysis: `${base}_analysis.json`,
    scope: `${base}_scope.json`,
    plan: `${base}_plan.json`,
    optimized: `${base}_plan_optimized.json`,
    metadata: `${base}_paths.json`,
    truncated: wasTruncated,
    maxLength,
  };

  return plannerPathsSchema.parse(paths);
}

export type PlannerPathsResult = PlannerPaths;
