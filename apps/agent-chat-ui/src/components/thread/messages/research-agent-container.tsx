"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { SearchResultData } from "@/lib/research-agent-grouper";
import { ExaSearchResults } from "./exa-search-results";
import { TavilySearchResults } from "./tavily-search-results";

type ResearchAgentStatus = "pending" | "in_progress" | "completed";

interface ResearchAgent {
  taskDescription: string;
  searchResults: SearchResultData[];
  findings?: string;
  status: ResearchAgentStatus;
  statusUpdates?: string[];
}

interface ResearchAgentContainerProps {
  agents: ResearchAgent[];
}

function getStatusIcon(status: ResearchAgentStatus) {
  switch (status) {
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    case "in_progress":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  }
}

function getStatusColor(status: ResearchAgentStatus) {
  switch (status) {
    case "pending":
      return "text-gray-500 border-gray-300";
    case "in_progress":
      return "text-blue-600 border-blue-400 bg-blue-50";
    case "completed":
      return "text-green-600 border-green-500 bg-green-50";
  }
}

export function ResearchAgentContainer({
  agents,
}: ResearchAgentContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (agents.length === 0) return null;

  const currentAgent = agents[activeTab];

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-gray-200 border-b bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search className="h-4 w-4 flex-shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Research Agents
                </h3>
                {agents.length > 1 && (
                  <p className="mt-0.5 text-gray-500 text-xs">
                    {agents.length} {agents.length === 1 ? "agent" : "agents"}{" "}
                    active
                  </p>
                )}
              </div>
            </div>
            <button
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs - Show even when collapsed if there are multiple agents */}
        {agents.length > 1 && (
          <div className="border-gray-200 border-b bg-white">
            <div className="flex overflow-x-auto">
              {agents.map((agent, idx) => (
                <button
                  className={`flex-shrink-0 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === idx
                      ? `border-blue-600 ${getStatusColor(agent.status)}`
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(agent.status)}
                    <span>Agent {idx + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed Preview - Task and Read Findings button */}
        {!isExpanded && (
          <div className="bg-white p-4">
            <p className="mb-3 text-gray-700 text-sm">
              <span className="font-medium text-gray-900">Task:</span>{" "}
              {currentAgent.taskDescription}
            </p>
            {currentAgent.findings && (
              <button
                className="inline-flex items-center gap-2 font-medium text-blue-600 text-sm transition-colors hover:text-blue-700"
                onClick={() => setIsExpanded(true)}
              >
                <FileText className="h-4 w-4" />
                Read Research Findings
              </button>
            )}
          </div>
        )}

        {/* Expanded Content */}
        <motion.div
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          className="overflow-hidden"
          initial={false}
          transition={{ duration: 0.2 }}
        >
          <div className="max-h-[600px] overflow-y-auto">
            {/* Task Description */}
            <div className="border-gray-100 border-b bg-blue-50 p-4">
              <p className="text-gray-700 text-sm">
                <span className="font-medium text-gray-900">Task:</span>{" "}
                {currentAgent.taskDescription}
              </p>
            </div>

            {/* Status Updates Section */}
            {currentAgent.statusUpdates &&
              currentAgent.statusUpdates.length > 0 && (
                <div className="border-gray-100 border-b p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 text-blue-500" />
                    <h4 className="font-medium text-gray-700 text-sm">
                      Status Updates
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {currentAgent.statusUpdates.map((update, idx) => (
                      <div className="pl-4" key={idx}>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {update}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Search Results Section */}
            {currentAgent.searchResults.length > 0 && (
              <div className="border-gray-100 border-b p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-gray-500" />
                  <h4 className="font-medium text-gray-700 text-sm">
                    Search Results ({currentAgent.searchResults.length}{" "}
                    {currentAgent.searchResults.length === 1
                      ? "query"
                      : "queries"}
                    )
                  </h4>
                </div>
                <div className="space-y-4">
                  {currentAgent.searchResults.map((searchData, idx) => (
                    <div className="pl-4" key={idx}>
                      {searchData.searchType === "tavily" ? (
                        <TavilySearchResults
                          query={searchData.query}
                          responseTime={searchData.responseTime}
                          results={searchData.results}
                        />
                      ) : (
                        <ExaSearchResults
                          query={searchData.query}
                          responseTime={searchData.responseTime}
                          results={searchData.results}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research Findings Section */}
            {currentAgent.findings && (
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-green-600" />
                  <h4 className="font-medium text-gray-700 text-sm">
                    Research Findings
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                    {currentAgent.findings}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
