"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type GithubSettingsContextType = {
  githubEnabled: boolean;
  githubPat: string | null;
  setGithubEnabled: (enabled: boolean) => void;
  setGithubPat: (pat: string | null) => void;
};

const GithubSettingsContext = createContext<
  GithubSettingsContextType | undefined
>(undefined);

const STORAGE_KEY_ENABLED = "github-mcp-enabled";
const STORAGE_KEY_PAT = "github-mcp-pat";

export function GithubSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [githubEnabled, setGithubEnabledState] = useState<boolean>(false);
  const [githubPat, setGithubPatState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedEnabled = sessionStorage.getItem(STORAGE_KEY_ENABLED);
    const savedPat = sessionStorage.getItem(STORAGE_KEY_PAT);

    if (savedEnabled === "true") {
      setGithubEnabledState(true);
    }
    if (savedPat) {
      setGithubPatState(savedPat);
    }

    setIsInitialized(true);
  }, []);

  const setGithubEnabled = (enabled: boolean) => {
    setGithubEnabledState(enabled);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));

      // Clear PAT if disabling
      if (!enabled) {
        sessionStorage.removeItem(STORAGE_KEY_PAT);
        setGithubPatState(null);
      }
    }
  };

  const setGithubPat = (pat: string | null) => {
    setGithubPatState(pat);
    if (typeof window !== "undefined") {
      if (pat) {
        sessionStorage.setItem(STORAGE_KEY_PAT, pat);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_PAT);
      }
    }
  };

  // Don't render children until initialized to prevent hydration mismatches
  if (!isInitialized) {
    return null;
  }

  return (
    <GithubSettingsContext.Provider
      value={{
        githubEnabled,
        githubPat,
        setGithubEnabled,
        setGithubPat,
      }}
    >
      {children}
    </GithubSettingsContext.Provider>
  );
}

export function useGithubSettings() {
  const context = useContext(GithubSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useGithubSettings must be used within a GithubSettingsProvider"
    );
  }
  return context;
}
