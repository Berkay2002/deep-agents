"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

interface GithubConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MCPServer {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  requiresAuth: boolean;
}

export function GithubConfigDialog({ open, onOpenChange }: GithubConfigDialogProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchMCPStatus();
    }
  }, [open]);

  const fetchMCPStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mcp-status");
      if (!response.ok) {
        throw new Error("Failed to fetch MCP status");
      }
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error("Error fetching MCP status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label className="text-base font-medium">Active MCP Servers</Label>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {servers.map((server) => (
                  <div
                    key={server.name}
                    className={`flex items-center gap-2 rounded-md border p-3 ${
                      server.enabled
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        server.enabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
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
                        {server.requiresAuth && !server.enabled && " (requires authentication)"}
                      </p>
                    </div>
                  </div>
                ))}

                {servers.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No MCP servers configured
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MCP Info */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>What is MCP?</strong> Model Context Protocol enables AI agents to connect to
                external tools and services, expanding their capabilities beyond text generation.
              </div>
            </div>
          </div>

          {/* Developer Note - only show if GitHub Copilot is disabled */}
          {servers.some(s => s.name === "github-copilot" && !s.enabled) && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Developer Note:</strong> To enable GitHub Copilot MCP, set the <code className="text-xs bg-yellow-100 px-1 py-0.5 rounded">GITHUB_PAT</code> environment
                  variable in <code className="text-xs bg-yellow-100 px-1 py-0.5 rounded">apps/agent/.env</code>. Leave empty in production for security.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
