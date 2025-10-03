import type { Thread } from "@langchain/langgraph-sdk";
import { useQueryState } from "nuqs";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import { validate } from "uuid";
import { getApiKey } from "@/lib/api-key";
import { createClient } from "./client";

type ThreadContextType = {
  getThreads: () => Promise<Thread[]>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
};

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

function getThreadSearchMetadata(
  assistantId: string
): { graphId: string } | { assistantId: string } {
  if (validate(assistantId)) {
    return { assistantId };
  }
  return { graphId: assistantId };
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  const [apiUrl] = useQueryState("apiUrl");
  const [assistantId] = useQueryState("assistantId");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    if (!(apiUrl && assistantId)) {
      return [];
    }
    const client = createClient(apiUrl, getApiKey() ?? undefined);

    const fetchedThreads = await client.threads.search({
      metadata: {
        ...getThreadSearchMetadata(assistantId),
      },
      limit: 100,
    });

    return fetchedThreads;
  }, [apiUrl, assistantId]);

  const value = {
    getThreads,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
