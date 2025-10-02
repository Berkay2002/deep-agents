"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, FileText, Loader2, CheckCircle2, Clock } from "lucide-react";
import { TavilySearchResults } from "./tavily-search-results";
import { ExaSearchResults } from "./exa-search-results";
import type { SearchResultData } from "@/lib/research-agent-grouper";

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
      return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    case "in_progress":
      return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
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
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Research Agents
                </h3>
                {agents.length > 1 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {agents.length} {agents.length === 1 ? "agent" : "agents"} active
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs - Show even when collapsed if there are multiple agents */}
        {agents.length > 1 && (
          <div className="border-b border-gray-200 bg-white">
            <div className="flex overflow-x-auto">
              {agents.map((agent, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === idx
                      ? `border-blue-600 ${getStatusColor(agent.status)}`
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
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
          <div className="p-4 bg-white">
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-medium text-gray-900">Task:</span>{" "}
              {currentAgent.taskDescription}
            </p>
            {currentAgent.findings && (
              <button
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Read Research Findings
              </button>
            )}
          </div>
        )}

        {/* Expanded Content */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="max-h-[600px] overflow-y-auto">
            {/* Task Description */}
            <div className="border-b border-gray-100 p-4 bg-blue-50">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Task:</span>{" "}
                {currentAgent.taskDescription}
              </p>
            </div>

            {/* Status Updates Section */}
            {currentAgent.statusUpdates && currentAgent.statusUpdates.length > 0 && (
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Status Updates
                  </h4>
                </div>
                <div className="space-y-3">
                  {currentAgent.statusUpdates.map((update, idx) => (
                    <div key={idx} className="pl-4">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm text-gray-700 leading-relaxed">
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
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-3.5 h-3.5 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Search Results ({currentAgent.searchResults.length}{" "}
                    {currentAgent.searchResults.length === 1 ? "query" : "queries"})
                  </h4>
                </div>
                <div className="space-y-4">
                  {currentAgent.searchResults.map((searchData, idx) => (
                    <div key={idx} className="pl-4">
                      {searchData.searchType === "tavily" ? (
                        <TavilySearchResults
                          query={searchData.query}
                          results={searchData.results}
                          responseTime={searchData.responseTime}
                        />
                      ) : (
                        <ExaSearchResults
                          query={searchData.query}
                          results={searchData.results}
                          responseTime={searchData.responseTime}
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
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-green-600" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Research Findings
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
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
