"use client";

import type { AIMessage } from "@langchain/langgraph-sdk";
import { Book } from "lucide-react";

type ReadFileCallProps = {
  toolCall: NonNullable<AIMessage["tool_calls"]>[0];
};

export function ReadFileCall({ toolCall }: ReadFileCallProps) {
  const args = toolCall.args as Record<string, unknown>;
  const filePath = args.file_path || args.filePath || "unknown";
  const startLine = args.startLine || args.start_line;
  const endLine = args.endLine || args.end_line;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Book className="h-4 w-4 text-blue-500" />
          <h3 className="font-medium text-gray-900">
            {toolCall.name}
            {toolCall.id && (
              <code className="ml-2 rounded bg-gray-100 px-2 py-1 text-sm">
                {toolCall.id}
              </code>
            )}
          </h3>
        </div>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <tbody className="divide-y divide-gray-200">
          <tr>
            <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
              file_path
            </td>
            <td className="px-4 py-2 text-gray-500 text-sm">
              <code className="break-all rounded bg-gray-50 px-2 py-1 font-mono text-sm">
                {String(filePath)}
              </code>
            </td>
          </tr>
          {startLine != null && (
            <tr>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                start_line
              </td>
              <td className="px-4 py-2 text-gray-500 text-sm">
                <code className="break-all rounded bg-gray-50 px-2 py-1 font-mono text-sm">
                  {String(startLine)}
                </code>
              </td>
            </tr>
          )}
          {endLine != null && (
            <tr>
              <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                end_line
              </td>
              <td className="px-4 py-2 text-gray-500 text-sm">
                <code className="break-all rounded bg-gray-50 px-2 py-1 font-mono text-sm">
                  {String(endLine)}
                </code>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
