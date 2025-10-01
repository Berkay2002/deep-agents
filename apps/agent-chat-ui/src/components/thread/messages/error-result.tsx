"use client";

import { AlertCircle, FileX, RefreshCw } from "lucide-react";

interface ErrorResultProps {
  toolName: string;
  errorMessage: string;
}

function parseErrorType(message: string): {
  type: "not_found" | "permission" | "timeout" | "network" | "validation" | "generic";
  title: string;
  icon: React.ReactNode;
} {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("string not found") || lowerMessage.includes("not found in file")) {
    return {
      type: "not_found",
      title: "String Not Found",
      icon: <FileX className="w-5 h-5 text-red-500" />,
    };
  }

  if (lowerMessage.includes("permission") || lowerMessage.includes("access denied")) {
    return {
      type: "permission",
      title: "Permission Denied",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    };
  }

  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return {
      type: "timeout",
      title: "Operation Timed Out",
      icon: <RefreshCw className="w-5 h-5 text-yellow-500" />,
    };
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("econnrefused")
  ) {
    return {
      type: "network",
      title: "Network Error",
      icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
    };
  }

  if (lowerMessage.includes("invalid") || lowerMessage.includes("validation")) {
    return {
      type: "validation",
      title: "Validation Error",
      icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    };
  }

  return {
    type: "generic",
    title: "Tool Error",
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
  };
}

function extractErrorDetails(message: string): {
  summary: string;
  details?: string;
} {
  // Check for common error patterns

  // Pattern: "Error: String not found in file: '...'"
  const stringNotFoundMatch = message.match(/String not found in file: '(.+?)'/);
  if (stringNotFoundMatch) {
    const attemptedString = stringNotFoundMatch[1];
    const preview = attemptedString.length > 100
      ? attemptedString.slice(0, 100) + "..."
      : attemptedString;
    return {
      summary: "The text to replace was not found in the file",
      details: `Searched for: "${preview}"`,
    };
  }

  // Pattern: "Error: [message]"
  const errorMatch = message.match(/^Error:\s*(.+)$/i);
  if (errorMatch) {
    return {
      summary: errorMatch[1],
    };
  }

  // If message is very long, split into summary and details
  if (message.length > 200) {
    return {
      summary: message.slice(0, 200) + "...",
      details: message,
    };
  }

  return {
    summary: message,
  };
}

export function ErrorResult({ toolName, errorMessage }: ErrorResultProps) {
  const { title, icon } = parseErrorType(errorMessage);
  const { summary, details } = extractErrorDetails(errorMessage);

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border-2 border-red-200 bg-red-50">
        {/* Header */}
        <div className="border-b border-red-200 bg-red-100 px-4 py-3">
          <div className="flex items-center gap-3">
            {icon}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-900 text-sm">{title}</h3>
              <p className="text-xs text-red-700 mt-0.5">
                Tool: <code className="rounded bg-red-200 px-1.5 py-0.5">{toolName}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="p-4">
          <p className="text-sm text-red-900 font-medium mb-2">{summary}</p>

          {details && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-red-700 hover:text-red-900 font-medium">
                Show full error details
              </summary>
              <div className="mt-2 rounded bg-red-100 p-3">
                <code className="text-xs text-red-800 whitespace-pre-wrap break-all">
                  {details}
                </code>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
