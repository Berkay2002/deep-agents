"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type GithubConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type McpServer = {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  requiresAuth: boolean;
};

type McpStatusResponse = {
  servers?: McpServer[];
};

const normalizeServers = (data: McpStatusResponse): McpServer[] =>
  Array.isArray(data.servers) ? data.servers : [];

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Failed to fetch MCP status";

export function GithubConfigDialog({
  open,
  onOpenChange,
}: GithubConfigDialogProps) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMcpStatus = useCallback(async (signal: AbortSignal) => {
    if (signal.aborted) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/mcp-status", { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch MCP status");
      }

      const data = (await response.json()) as McpStatusResponse;
      if (signal.aborted) {
        return;
      }

      setServers(normalizeServers(data));
    } catch (error) {
      if (!signal.aborted) {
        setErrorMessage(toErrorMessage(error));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();

    fetchMcpStatus(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchMcpStatus, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>MCP Server Configuration</DialogTitle>
          <DialogDescription>
            MCP servers provide additional tools and capabilities to the agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Active MCP Servers */}
          <div className="space-y-3">
            <Label className="font-medium text-base">Active MCP Servers</Label>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {servers.map((server) => (
                  <div
                    className={`flex items-center gap-2 rounded-md border p-3 ${
                      server.enabled
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                    key={server.name}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        server.enabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          server.enabled ? "text-green-900" : "text-gray-900"
                        }`}
                      >
                        {server.displayName}
                      </p>
                      <p
                        className={`text-xs ${
                          server.enabled ? "text-green-700" : "text-gray-600"
                        }`}
                      >
                        {server.description}
                        {server.requiresAuth &&
                          !server.enabled &&
                          " (requires authentication)"}
                      </p>
                    </div>
                  </div>
                ))}

                {servers.length === 0 && (
                  <div className="py-4 text-center text-gray-500 text-sm">
                    No MCP servers configured
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-sm border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span className="text-red-800">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* MCP Info */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div className="text-blue-800 text-sm">
                <strong>What is MCP?</strong> Model Context Protocol enables AI
                agents to connect to external tools and services, expanding
                their capabilities beyond text generation.
              </div>
            </div>
          </div>

          {/* Developer Note - only show if GitHub Copilot is disabled */}
          {servers.some((s) => s.name === "github-copilot" && !s.enabled) && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                <div className="text-sm text-yellow-800">
                  <strong>Developer Note:</strong> To enable GitHub Copilot MCP,
                  set the{" "}
                  <code className="rounded-sm bg-yellow-100 px-1 py-0.5 text-xs">
                    GITHUB_PAT
                  </code>{" "}
                  environment variable in{" "}
                  <code className="rounded-sm bg-yellow-100 px-1 py-0.5 text-xs">
                    apps/agent/.env
                  </code>
                  . Leave empty in production for security.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
