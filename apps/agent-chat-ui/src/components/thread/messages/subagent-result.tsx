import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { MarkdownText } from "../markdown-text";

type ResearchFindings = {
  summary?: string;
  keyInformation: string[];
  sources: Array<{ label: string; url?: string }>;
  limitations: string[];
  raw: string;
};

type CritiqueAnalysis = {
  summary?: string;
  body: string;
  raw: string;
};

type PlannerPlan = {
  summary?: string;
  artifacts: string[];
  overview: Array<{ label: string; value: string }>;
  nextSteps: string[];
  optimizations: string[];
  raw: string;
};

function sanitizeBullet(line: string): string {
  return line.replace(/^[•*\-\d.\s]+/, "").trim();
}

function parseResearchFindings(content: string): ResearchFindings | null {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.some((line) => /^RESEARCH FINDINGS:/i.test(line))) {
    return null;
  }

  const findings: ResearchFindings = {
    summary: undefined,
    keyInformation: [],
    sources: [],
    limitations: [],
    raw: content,
  };

  let currentSection: "keyInformation" | "sources" | "limitations" | null = null;

  for (const line of lines) {
    if (/^RESEARCH FINDINGS:/i.test(line)) {
      findings.summary = line.split(/:/, 2)[1]?.trim();
      continue;
    }

    if (/^KEY INFORMATION:/i.test(line)) {
      currentSection = "keyInformation";
      continue;
    }

    if (/^SOURCES:/i.test(line)) {
      currentSection = "sources";
      continue;
    }

    if (/^RESEARCH LIMITATIONS:/i.test(line)) {
      currentSection = "limitations";
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (/^[•*\-]/.test(line)) {
      const value = sanitizeBullet(line);
      if (currentSection === "sources") {
        const [maybeUrl, ...rest] = value.split(/\s+-\s+/);
        let url: string | undefined;
        let label = value;

        try {
          const parsedUrl = new URL(maybeUrl);
          url = parsedUrl.toString();
          label = rest.length > 0 ? rest.join(" - ") : parsedUrl.hostname;
        } catch {
          // leave label as-is when the first token is not a valid URL
          url = undefined;
          label = value;
        }

        findings.sources.push({ label, url });
      } else if (currentSection === "keyInformation") {
        findings.keyInformation.push(value);
      } else {
        findings.limitations.push(value);
      }
    }
  }

  return findings;
}

function parseCritiqueAnalysis(content: string): CritiqueAnalysis | null {
  if (!/^CRITIQUE/i.test(content.trim())) {
    return null;
  }

  const lines = content.split(/\r?\n/);
  let summary: string | undefined;
  let summaryLineIndex = -1;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]?.trim() ?? "";
    if (/^CRITIQUE (ANALYSIS )?SUMMARY:/i.test(line)) {
      summary = line.split(/:/, 2)[1]?.trim();
      summaryLineIndex = index;
      break;
    }
  }

  const bodyLines =
    summaryLineIndex >= 0
      ? lines.slice(summaryLineIndex + 1)
      : lines;

  return {
    summary,
    body: bodyLines.join("\n").trim(),
    raw: content,
  };
}

function parsePlannerPlan(content: string): PlannerPlan | null {
  if (!/^RESEARCH PLAN SUMMARY:/im.test(content)) {
    return null;
  }

  const lines = content.split(/\r?\n/);
  const plan: PlannerPlan = {
    summary: undefined,
    artifacts: [],
    overview: [],
    nextSteps: [],
    optimizations: [],
    raw: content,
  };

  type PlannerSection = "artifacts" | "overview" | "nextSteps" | "optimizations" | null;
  let currentSection: PlannerSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/^RESEARCH PLAN SUMMARY:/i.test(line)) {
      plan.summary = line.split(/:/, 2)[1]?.trim();
      currentSection = null;
      continue;
    }

    if (/^PLANNING ARTIFACTS(?: CREATED)?:/i.test(line)) {
      currentSection = "artifacts";
      continue;
    }

    if (/^QUICK OVERVIEW:/i.test(line)) {
      currentSection = "overview";
      continue;
    }

    if (/^NEXT STEPS(?: FOR MAIN AGENT)?:/i.test(line)) {
      currentSection = "nextSteps";
      continue;
    }

    if (/^OPTIMIZATION SUMMARY:/i.test(line)) {
      currentSection = "optimizations";
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (/^[•*\-]/.test(line)) {
      const value = sanitizeBullet(line);

      if (currentSection === "artifacts") {
        plan.artifacts.push(value);
        continue;
      }

      if (currentSection === "nextSteps") {
        plan.nextSteps.push(value);
        continue;
      }

      if (currentSection === "optimizations") {
        plan.optimizations.push(value);
        continue;
      }

      if (currentSection === "overview") {
        const [label, ...rest] = value.split(/\s*:\s*/);
        if (label) {
          plan.overview.push({ label, value: rest.join(": ") || "" });
        }
      }
    }
  }

  return plan;
}

function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-muted-foreground text-xs uppercase tracking-wide", className)}>
      {children}
    </h3>
  );
}

export function SubagentTaskResult({
  content,
  subagentType,
}: {
  content: string;
  subagentType: string;
}) {
  if (subagentType === "planner-agent") {
    const parsed = parsePlannerPlan(content);

    if (parsed) {
      const { summary, artifacts, overview, nextSteps, optimizations } = parsed;

      return (
        <Card className="border-sky-300/60 bg-sky-50">
          <CardHeader className="flex flex-col gap-2">
            <span className="text-sky-700 text-xs font-semibold uppercase tracking-wide">
              Planner Agent
            </span>
            <CardTitle className="text-base">Draft research plan</CardTitle>
            {summary && <CardDescription>{summary}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pb-6">
            {artifacts.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Planning Artifacts</SectionTitle>
                <ul className="space-y-1 text-sm">
                  {artifacts.map((item, index) => (
                    <li className="flex gap-2" key={`${item}-${index}`}>
                      <span aria-hidden className="text-sky-700">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {overview.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Quick Overview</SectionTitle>
                <dl className="grid gap-1 text-sm">
                  {overview.map(({ label, value }, index) => (
                    <div className="grid grid-cols-[auto_1fr] gap-2" key={`${label}-${index}`}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {nextSteps.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Next Steps</SectionTitle>
                <ol className="space-y-1 text-sm">
                  {nextSteps.map((step, index) => (
                    <li key={`${step}-${index}`}>
                      <span className="text-sky-700">{index + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {optimizations.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Optimization Notes</SectionTitle>
                <ul className="space-y-1 text-sm">
                  {optimizations.map((item, index) => (
                    <li className="flex gap-2" key={`${item}-${index}`}>
                      <span aria-hidden className="text-sky-700">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
  }

  if (subagentType === "research-agent") {
    const parsed = parseResearchFindings(content);

    if (parsed) {
      const { summary, keyInformation, sources, limitations } = parsed;

      return (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-col gap-2">
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">
              Research Agent
            </span>
            <CardTitle className="text-base">Intermediate findings</CardTitle>
            {summary && <CardDescription>{summary}</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pb-6">
            {keyInformation.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Key Information</SectionTitle>
                <ul className="space-y-1 text-sm">
                  {keyInformation.map((item, index) => (
                    <li className="flex gap-2" key={`${item}-${index}`}>
                      <span aria-hidden className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sources.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Sources</SectionTitle>
                <ul className="space-y-1 text-sm">
                  {sources.map((source, index) => (
                    <li className="flex gap-2" key={`${source.label}-${index}`}>
                      <span aria-hidden className="text-primary">•</span>
                      {source.url ? (
                        <a
                          className="text-primary underline decoration-primary/40 decoration-dotted underline-offset-2"
                          href={source.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {source.label}
                        </a>
                      ) : (
                        <span>{source.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {limitations.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Research Limitations</SectionTitle>
                <ul className="space-y-1 text-sm">
                  {limitations.map((item, index) => (
                    <li className="flex gap-2" key={`${item}-${index}`}>
                      <span aria-hidden className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
  }

  if (subagentType === "critique-agent") {
    const parsed = parseCritiqueAnalysis(content);

    if (parsed) {
      const { summary, body } = parsed;

      return (
        <Card className="border-amber-300/60 bg-amber-50">
          <CardHeader className="flex flex-col gap-2">
            <span className="text-amber-600 text-xs font-semibold uppercase tracking-wide">
              Critique Agent
            </span>
            <CardTitle className="text-base">Structured critique</CardTitle>
            {summary && <CardDescription>{summary}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {body ? (
              <MarkdownText>{body}</MarkdownText>
            ) : (
              <MarkdownText>{content}</MarkdownText>
            )}
          </CardContent>
        </Card>
      );
    }
  }

  const normalized = subagentType.replace(/-/g, " ");
  const hasContent = content.trim().length > 0;

  return (
    <Card className="bg-muted/40">
      <CardHeader className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
        </span>
        <CardTitle className="text-base">
          {hasContent ? "Agent output" : "Task completed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {hasContent ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              Output format not recognized. Showing raw response:
            </p>
            <MarkdownText>{content}</MarkdownText>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            This task completed successfully without additional output.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
