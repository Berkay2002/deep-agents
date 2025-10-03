"use client";

import { ExternalLink } from "lucide-react";
import { useMemo } from "react";
import type { CritiqueAgentGroup } from "@/lib/critique-agent-grouper";
import type { PlannerAgentGroup } from "@/lib/planner-agent-grouper";
import type { ResearchAgentGroup } from "@/lib/research-agent-grouper";
import { cn } from "@/lib/utils";

const WWW_REGEX = /^www\./;
const MAX_SOURCES_DISPLAYED = 12;

function getHostname(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(WWW_REGEX, "");
  } catch {
    return url;
  }
}

type SourcesPanelProps = {
  researchGroups: ResearchAgentGroup[];
  critiqueGroups: CritiqueAgentGroup[];
  plannerGroups: PlannerAgentGroup[];
  className?: string;
};

type Source = {
  url: string;
  title: string;
  origin: "tavily" | "exa" | "unknown";
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <It's fine here>
function collectSources(groups: ResearchAgentGroup[]): Source[] {
  const sourceMap = new Map<string, Source>();

  for (const group of groups) {
    for (const result of group.searchResults || []) {
      for (const item of result.results) {
        if (!item.url) {
          continue;
        }
        if (!sourceMap.has(item.url)) {
          sourceMap.set(item.url, {
            url: item.url,
            title:
              ("title" in item && item.title) ||
              ("summary" in item && item.summary) ||
              getHostname(item.url),
            origin: result.searchType,
          });
        }
      }
    }
  }

  return Array.from(sourceMap.values()).slice(0, MAX_SOURCES_DISPLAYED);
}

function collectPlannerStatus(groups: PlannerAgentGroup[]) {
  if (!groups.length) {
    return null;
  }

  const counts = groups.reduce(
    (acc, group) => {
      acc.total += 1;
      const status = group.status ?? "pending";
      switch (status) {
        case "in_progress":
          acc.inProgress += 1;
          break;
        case "completed":
          acc.completed += 1;
          break;
        default:
          acc.pending += 1;
          break;
      }
      return acc;
    },
    { total: 0, pending: 0, inProgress: 0, completed: 0 }
  );

  return counts;
}

function collectCritiqueSummary(groups: CritiqueAgentGroup[]) {
  if (!groups.length) {
    return null;
  }

  let totalFindings = 0;
  const severityCounts: Record<string, number> = {};

  const incrementSeverity = (value: string | undefined) => {
    const level = value || "medium";
    severityCounts[level] = (severityCounts[level] || 0) + 1;
    totalFindings += 1;
  };

  for (const group of groups) {
    if (group.saveCritiqueResults?.length) {
      for (const result of group.saveCritiqueResults) {
        for (const finding of result.findings ?? []) {
          incrementSeverity(finding.severity);
        }
      }
      continue;
    }

    if (group.critique) {
      incrementSeverity("medium");
    }
  }

  return totalFindings > 0
    ? { total: totalFindings, severity: severityCounts }
    : null;
}

export function ResearchSummaryPanel({
  researchGroups,
  critiqueGroups,
  plannerGroups,
  className,
}: SourcesPanelProps) {
  const sources = useMemo(
    () => collectSources(researchGroups),
    [researchGroups]
  );
  const plannerStatus = useMemo(
    () => collectPlannerStatus(plannerGroups),
    [plannerGroups]
  );
  const critiqueSummary = useMemo(
    () => collectCritiqueSummary(critiqueGroups),
    [critiqueGroups]
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-6 overflow-y-auto border-l bg-muted/30 px-6 py-6",
        className
      )}
    >
      <section>
        <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          Sources
        </h2>
        <ol className="mt-3 space-y-3 text-sm">
          {sources.length === 0 && (
            <li className="text-muted-foreground">No sources captured yet.</li>
          )}
          {sources.map((source, index) => (
            <li key={source.url}>
              <a
                className="group flex items-center gap-2 text-blue-600 hover:text-blue-500"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                <span className="font-semibold text-muted-foreground text-xs">
                  {index + 1}.
                </span>
                <span className="flex-1 truncate">{source.title}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
              <p className="pl-6 text-muted-foreground text-xs">
                {getHostname(source.url)} - {source.origin.toUpperCase()}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {plannerStatus && (
        <section>
          <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Planner Progress
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Tasks</dt>
              <dd className="font-semibold">{plannerStatus.total}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">In Progress</dt>
              <dd className="font-semibold">{plannerStatus.inProgress}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-semibold">{plannerStatus.completed}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pending</dt>
              <dd className="font-semibold">{plannerStatus.pending}</dd>
            </div>
          </dl>
        </section>
      )}

      {critiqueSummary && (
        <section>
          <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            Critique Summary
          </h2>
          <p className="mt-3 text-muted-foreground text-sm">
            {critiqueSummary.total} findings recorded
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
            {Object.entries(critiqueSummary.severity).map(([level, count]) => (
              <li key={level}>
                <span className="font-medium capitalize">{level}</span>: {count}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
