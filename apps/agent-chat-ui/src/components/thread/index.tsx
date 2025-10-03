/** biome-ignore-all lint/correctness/noUnusedImports: <> */
/** biome-ignore-all lint/style/useNamingConvention: <> */
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import type { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { motion } from "framer-motion";
import {
  ArrowDown,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  SquarePen,
  XIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { v4 as uuidv4 } from "uuid";

import { useFileUpload } from "@/hooks/use-file-upload";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  type CritiqueAgentGroup,
  groupCritiqueAgentMessages,
} from "@/lib/critique-agent-grouper";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import {
  groupPlannerAgentMessages,
  type PlannerAgentGroup,
} from "@/lib/planner-agent-grouper";
import {
  groupResearchAgentMessages,
  type ResearchAgentGroup,
} from "@/lib/research-agent-grouper";
import { filterSubagentResponses } from "@/lib/subagent-filter";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { GithubSvg } from "../icons/github";
import { LanggraphLogoSvg } from "../icons/langgraph";
import { GithubConfigDialog } from "../settings/github-config-dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { AnswerCard } from "./answer-card";
import {
  ArtifactContent,
  ArtifactTitle,
  useArtifactContext,
  useArtifactOpen,
} from "./artifact";
import { ContentBlocksPreview } from "./content-blocks-preview";
import ThreadHistory from "./history";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { CritiqueAgentContainer } from "./messages/critique-agent-container";
import { HumanMessage } from "./messages/human";
import { PlannerAgentContainer } from "./messages/planner-agent-container";
import { ResearchAgentContainer } from "./messages/research-agent-container";
import { ResearchSummaryPanel } from "./research-summary-panel";
import {
  createTimelineActivity,
  getActivityTypeFromTool,
  type TimelineActivity,
  TimelineContainer,
} from "./timeline-container";
import { TooltipIconButton } from "./tooltip-icon-button";
import { getContentString } from "./utils";

const SIDEBAR_WIDTH = 300;
const SIDEBAR_OFFSET = -300;
const BUTTON_OFFSET = 48;
const RESEARCH_ORDER_OFFSET = 0.3;
const PLANNER_ORDER_OFFSET = 0.2;
const CRITIQUE_ORDER_OFFSET = 0.1;

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      className={props.className}
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
    >
      <div className={props.contentClassName} ref={context.contentRef}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) {
    return null;
  }
  return (
    <Button
      className={props.className}
      onClick={() => scrollToBottom()}
      variant="outline"
    >
      <ArrowDown className="h-4 w-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

function summarizeText(text: string, limit = 140) {
  if (!text) {
    return "No content available.";
  }
  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit - 1).trim()}...`;
}

type FeedEntry = {
  id: string;
  order: number;
  timeline: TimelineActivity;
  render: ReactNode;
};
function McpServerConfigButton({ onClick }: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="MCP Server Settings"
            className="flex cursor-pointer items-center justify-center"
            onClick={onClick}
            type="button"
          >
            <GithubSvg height="24" width="24" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>MCP Server Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper functions to reduce complexity
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <It's fine>
export function Thread() {
  const artifactContext = useArtifactContext();
  const [artifactOpen, closeArtifact] = useArtifactOpen();

  const [threadId, _setThreadId] = useQueryState("threadId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false)
  );
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false)
  );
  const [input, setInput] = useState("");
  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    resetBlocks: _resetBlocks,
    dragOver,
    handlePaste,
  } = useFileUpload();
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  const setThreadId = (id: string | null) => {
    _setThreadId(id);

    // close artifact
    closeArtifact();
  };

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as Error).message;
      if (!message || lastError.current === message) {
        // Message has already been logged. do not modify ref, return early.
        return;
      }

      // Message is defined, and it has not been logged yet. Save it, and send the error
      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  // TODO: this should be part of the useStream hook
  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages.at(-1)?.type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (
      (input.trim().length === 0 && contentBlocks.length === 0) ||
      isLoading
    ) {
      return;
    }
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: [
        ...(input.trim().length > 0 ? [{ type: "text", text: input }] : []),
        ...contentBlocks,
      ] as Message["content"],
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);

    const context =
      Object.keys(artifactContext).length > 0 ? artifactContext : undefined;

    const submitData: {
      messages: Message[];
      context?: typeof artifactContext;
    } = {
      messages: [...toolMessages, newHumanMessage],
    };
    if (context) {
      submitData.context = context;
    }

    stream.submit(submitData, {
      config: { recursion_limit: 100 },
      streamMode: ["values"],
      streamSubgraphs: true,
      streamResumable: true,
      optimisticValues: (prev) => ({
        ...prev,
        context,
        messages: [...(prev.messages ?? []), ...toolMessages, newHumanMessage],
      }),
    });

    setInput("");
    setContentBlocks([]);
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined
  ) => {
    // Do this so the loading state is correct
    prevMessageLength.current -= 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      config: { recursion_limit: 100 },
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      streamSubgraphs: true,
      streamResumable: true,
    });
  };

  const filteredMessages = messages
    .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
    .filter((m) => {
      const filtered = filterSubagentResponses([m]);
      return filtered.length > 0;
    });

  const researchGroups = groupResearchAgentMessages(filteredMessages);
  const critiqueGroups = groupCritiqueAgentMessages(filteredMessages);
  const plannerGroups = groupPlannerAgentMessages(filteredMessages);

  const feedEntries: FeedEntry[] = [];
  const addEntry = (entry: FeedEntry) => {
    feedEntries.push(entry);
  };

  if (researchGroups.length > 0) {
    const firstIndex = Math.min(
      ...researchGroups.map((group) => group.startIndex)
    );
    const id = `research-${firstIndex}`;
    const agents = researchGroups.map((group) => ({
      taskDescription: group.taskDescription,
      searchResults: group.searchResults,
      fileOperations: group.fileOperations,
      findings: group.findings,
      status: group.status,
    }));
    addEntry({
      id,
      order: firstIndex - RESEARCH_ORDER_OFFSET,
      timeline: createTimelineActivity(
        id,
        "research",
        <div className="text-muted-foreground text-xs">
          {researchGroups.length} research task
          {researchGroups.length === 1 ? "" : "s"}
        </div>,
        {
          title: "Research Agents",
          status: researchGroups[0].status,
        }
      ),
      render: <ResearchAgentContainer agents={agents} />,
    });
  }

  if (plannerGroups.length > 0) {
    const firstIndex = Math.min(
      ...plannerGroups.map((group) => group.startIndex)
    );
    const id = `planner-${firstIndex}`;
    const agents = plannerGroups.map((group) => ({
      taskDescription: group.taskDescription,
      topicAnalysis: group.topicAnalysis,
      scopeEstimation: group.scopeEstimation,
      planOptimization: group.planOptimization,
      fileOperations: group.fileOperations,
      finalPlan: group.finalPlan,
      status: group.status,
    }));
    addEntry({
      id,
      order: firstIndex - PLANNER_ORDER_OFFSET,
      timeline: createTimelineActivity(
        id,
        "planning",
        <div className="text-muted-foreground text-xs">
          {plannerGroups.length} planning cycle
          {plannerGroups.length === 1 ? "" : "s"}
        </div>,
        {
          title: "Planner Agents",
          status: plannerGroups[0].status,
        }
      ),
      render: <PlannerAgentContainer agents={agents} />,
    });
  }

  if (critiqueGroups.length > 0) {
    const firstIndex = Math.min(
      ...critiqueGroups.map((group) => group.startIndex)
    );
    const id = `critique-${firstIndex}`;
    const agents = critiqueGroups.map((group) => ({
      taskDescription: group.taskDescription,
      critique: group.critique,
      fileReads: group.fileReads,
      fileOperations: group.fileOperations,
    }));
    addEntry({
      id,
      order: firstIndex - CRITIQUE_ORDER_OFFSET,
      timeline: createTimelineActivity(
        id,
        "critique",
        <div className="text-muted-foreground text-xs">
          {critiqueGroups.length} critique pass
          {critiqueGroups.length === 1 ? "" : "es"}
        </div>,
        {
          title: "Critique Agents",
        }
      ),
      render: <CritiqueAgentContainer agents={agents} />,
    });
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <It's fine>
  filteredMessages.forEach((message, index) => {
    const baseId = message.id || `${message.type}-${index}`;
    const entryId = `${message.type}-${baseId}`;
    const preview =
      typeof message.content === "string"
        ? message.content
        : getContentString(message.content ?? []);
    const summary = summarizeText(preview);

    if (message.type === "human") {
      addEntry({
        id: entryId,
        order: index,
        timeline: createTimelineActivity(
          entryId,
          "conversation",
          <p className="line-clamp-3 whitespace-pre-wrap text-muted-foreground text-xs">
            {summary}
          </p>,
          { title: "User Message" }
        ),
        render: (
          <HumanMessage
            alignment="left"
            isLoading={isLoading}
            message={message}
          />
        ),
      });
      return;
    }

    const timelineType =
      message.type === "tool"
        ? getActivityTypeFromTool(message.name ?? "tool")
        : "conversation";
    const isError =
      message.type === "tool" &&
      typeof message.content === "string" &&
      message.content.toLowerCase().includes("error");

    const timelineTitle =
      message.type === "tool"
        ? `Tool: ${message.name ?? "Result"}`
        : "Assistant Message";
    let timelineStatus: "error" | "completed" | undefined;
    if (message.type === "tool") {
      timelineStatus = isError ? "error" : "completed";
    }

    addEntry({
      id: entryId,
      order: index,
      timeline: createTimelineActivity(
        entryId,
        timelineType,
        <p className="line-clamp-3 whitespace-pre-wrap text-muted-foreground text-xs">
          {summary}
        </p>,
        {
          title: timelineTitle,
          status: timelineStatus,
        }
      ),
      render: (
        <AssistantMessage
          alignment="left"
          handleRegenerate={handleRegenerate}
          isLoading={isLoading}
          message={message}
        />
      ),
    });
  });

  const orderedFeedEntries = feedEntries
    .sort((a, b) => a.order - b.order)
    .filter(
      (entry, idx, arr) =>
        arr.findIndex((candidate) => candidate.id === entry.id) === idx
    );

  const timelineActivities = orderedFeedEntries.map((entry) => entry.timeline);

  const feedCards = orderedFeedEntries.map((entry) => (
    <AnswerCard anchorId={entry.id} key={entry.id}>
      {entry.render}
    </AnswerCard>
  ));

  const handleActivitySelect = useCallback((activityId: string) => {
    if (typeof document === "undefined") {
      return;
    }
    const element = document.getElementById(activityId);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const chatStarted = !!threadId || !!messages.length;
  const hasNoAiOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool"
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative hidden lg:flex">
        <motion.div
          animate={{ x: chatHistoryOpen ? 0 : SIDEBAR_OFFSET }}
          className="absolute z-20 h-full overflow-hidden border-r bg-white"
          initial={{ x: SIDEBAR_OFFSET }}
          style={{ width: SIDEBAR_WIDTH }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full" style={{ width: SIDEBAR_WIDTH }}>
            <ThreadHistory />
          </div>
        </motion.div>
      </div>

      <div className="flex w-full overflow-hidden">
        <motion.div
          animate={{
            marginLeft: chatHistoryOpen && isLargeScreen ? SIDEBAR_WIDTH : 0,
            width:
              chatHistoryOpen && isLargeScreen
                ? `calc(100% - ${SIDEBAR_WIDTH}px)`
                : "100%",
          }}
          className="flex flex-1 overflow-hidden"
          layout={isLargeScreen}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <aside className="hidden w-72 flex-col border-r bg-muted/20 xl:flex">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                Timeline
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {timelineActivities.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No activity yet.
                </p>
              ) : (
                <TimelineContainer
                  activities={timelineActivities}
                  onActivitySelect={handleActivitySelect}
                />
              )}
            </div>
          </aside>
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {!chatStarted && (
              <div className="absolute top-0 left-0 z-10 flex w-full items-center justify-between gap-3 p-2 pl-4">
                <div>
                  {!(chatHistoryOpen && isLargeScreen) && (
                    <Button
                      className="hover:bg-gray-100"
                      onClick={() => setChatHistoryOpen((p) => !p)}
                      variant="ghost"
                    >
                      {chatHistoryOpen ? (
                        <PanelRightOpen className="size-5" />
                      ) : (
                        <PanelRightClose className="size-5" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="absolute top-2 right-4 flex items-center">
                  <McpServerConfigButton
                    onClick={() => setGithubDialogOpen(true)}
                  />
                </div>
              </div>
            )}
            <GithubConfigDialog
              onOpenChange={setGithubDialogOpen}
              open={githubDialogOpen}
            />
            {chatStarted && (
              <div className="relative z-10 flex items-center justify-between gap-3 p-2">
                <div className="relative flex items-center justify-start gap-2">
                  <div className="absolute left-0 z-10">
                    {!(chatHistoryOpen && isLargeScreen) && (
                      <Button
                        className="hover:bg-gray-100"
                        onClick={() => setChatHistoryOpen((p) => !p)}
                        variant="ghost"
                      >
                        {chatHistoryOpen ? (
                          <PanelRightOpen className="size-5" />
                        ) : (
                          <PanelRightClose className="size-5" />
                        )}
                      </Button>
                    )}
                  </div>
                  <motion.button
                    animate={{
                      marginLeft: chatHistoryOpen ? 0 : BUTTON_OFFSET,
                    }}
                    aria-label="New thread"
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => setThreadId(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                      }
                    }}
                    onKeyUp={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setThreadId(null);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    type="button"
                  >
                    <LanggraphLogoSvg height={32} width={32} />
                    <span className="font-semibold text-xl tracking-tight">
                      Agent Chat
                    </span>
                  </motion.button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <McpServerConfigButton
                      onClick={() => setGithubDialogOpen(true)}
                    />
                    <SignedOut>
                      <SignInButton mode="modal" />
                    </SignedOut>
                    <SignedIn>
                      <UserButton />
                    </SignedIn>
                  </div>
                  <TooltipIconButton
                    className="p-4"
                    onClick={() => setThreadId(null)}
                    size="lg"
                    tooltip="New thread"
                    variant="ghost"
                  >
                    <SquarePen className="size-5" />
                  </TooltipIconButton>
                </div>

                <div className="absolute inset-x-0 top-full h-5 bg-linear-to-b from-background to-background/0" />
              </div>
            )}

            <StickToBottom className="relative flex-1 overflow-hidden">
              <StickyToBottomContent
                className={cn(
                  "absolute inset-0 overflow-y-scroll px-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5",
                  !chatStarted && "mt-[25vh] flex flex-col items-stretch",
                  chatStarted && "grid grid-rows-[1fr_auto]"
                )}
                content={
                  <>
                    {feedCards}
                    {hasNoAiOrToolMessages && !!stream.interrupt && (
                      <AnswerCard
                        anchorId="interrupt-card"
                        key="interrupt-card"
                      >
                        <AssistantMessage
                          alignment="left"
                          handleRegenerate={handleRegenerate}
                          isLoading={isLoading}
                          message={undefined}
                        />
                      </AnswerCard>
                    )}
                    {isLoading && !firstTokenReceived && (
                      <AnswerCard anchorId="loading-card" key="loading-card">
                        <AssistantMessageLoading />
                      </AnswerCard>
                    )}
                  </>
                }
                contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10"
                footer={
                  <div className="sticky bottom-0 z-30 flex flex-col items-center gap-8 bg-white">
                    {!chatStarted && (
                      <div className="flex items-center gap-3">
                        <LanggraphLogoSvg className="h-8 shrink-0" />
                        <h1 className="font-semibold text-2xl tracking-tight">
                          Agent Chat
                        </h1>
                      </div>
                    )}

                    <ScrollToBottom className="fade-in-0 zoom-in-95 -translate-x-1/2 absolute bottom-full left-1/2 mb-4 animate-in" />

                    <div
                      className={cn(
                        "relative z-20 mx-auto mb-8 w-full max-w-3xl rounded-2xl bg-muted shadow-xs transition-all",
                        dragOver
                          ? "border-2 border-primary border-dotted"
                          : "border border-solid"
                      )}
                      ref={dropRef}
                    >
                      <form
                        className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2"
                        onSubmit={handleSubmit}
                      >
                        <ContentBlocksPreview
                          blocks={contentBlocks}
                          onRemove={removeBlock}
                        />
                        <textarea
                          className="field-sizing-content resize-none border-none bg-transparent p-3.5 pb-0 shadow-none outline-hidden ring-0 focus:outline-hidden focus:ring-0"
                          onChange={(event) => setInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.metaKey &&
                              !event.nativeEvent.isComposing
                            ) {
                              event.preventDefault();
                              const element = event.target as
                                | HTMLElement
                                | undefined;
                              const formElement = element?.closest("form");
                              formElement?.requestSubmit();
                            }
                          }}
                          onPaste={handlePaste}
                          placeholder="Type your message..."
                          value={input}
                        />

                        <div className="flex items-center gap-6 p-2 pt-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={hideToolCalls ?? false}
                                id="render-tool-calls"
                                onCheckedChange={setHideToolCalls}
                              />
                              <Label
                                className="text-gray-600 text-sm"
                                htmlFor="render-tool-calls"
                              >
                                Hide Tool Calls
                              </Label>
                            </div>
                          </div>
                          <Label
                            className="flex cursor-pointer items-center gap-2"
                            htmlFor="file-input"
                          >
                            <Plus className="size-5 text-gray-600" />
                            <span className="text-gray-600 text-sm">
                              Upload PDF or Image
                            </span>
                          </Label>
                          <input
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                            className="hidden"
                            id="file-input"
                            multiple
                            onChange={handleFileUpload}
                            type="file"
                          />
                          {stream.isLoading ? (
                            <Button
                              className="ml-auto"
                              key="stop"
                              onClick={() => stream.stop()}
                            >
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              className="ml-auto shadow-md transition-all"
                              disabled={
                                isLoading ||
                                (!input.trim() && contentBlocks.length === 0)
                              }
                              type="submit"
                            >
                              Send
                            </Button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                }
              />
            </StickToBottom>
          </div>
          <ResearchSummaryPanel
            className="hidden w-80 xl:flex"
            critiqueGroups={critiqueGroups}
            plannerGroups={plannerGroups}
            researchGroups={researchGroups}
          />
          {artifactOpen && (
            <div className="hidden w-[360px] flex-col border-l bg-background xl:flex">
              <div className="grid grid-cols-[1fr_auto] border-b p-4">
                <ArtifactTitle className="overflow-hidden truncate" />
                <button
                  aria-label="Close artifact"
                  className="cursor-pointer"
                  onClick={closeArtifact}
                  type="button"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
              <ArtifactContent className="relative grow" />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
