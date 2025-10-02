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
  isMessageInCritiqueGroup,
  isToolCallInCritiqueGroup,
} from "@/lib/critique-agent-grouper";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import {
  groupResearchAgentMessages,
  isMessageInResearchGroup,
  type ResearchAgentGroup,
} from "@/lib/research-agent-grouper";
import { filterSubagentResponses } from "@/lib/subagent-filter";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { GitHubSVG } from "../icons/github";
import { LangGraphLogoSVG } from "../icons/langgraph";
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
import {
  ArtifactContent,
  ArtifactTitle,
  useArtifactContext,
  useArtifactOpen,
} from "./artifact";
import { ContentBlocksPreview } from "./ContentBlocksPreview";
import ThreadHistory from "./history";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { CritiqueAgentContainer } from "./messages/critique-agent-container";
import { HumanMessage } from "./messages/human";
import { ResearchAgentContainer } from "./messages/research-agent-container";
import { TimelineAdapter } from "./timeline-adapter";
import { TooltipIconButton } from "./tooltip-icon-button";

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

  if (isAtBottom) return null;
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

function McpServerConfigButton({ onClick }: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex cursor-pointer items-center justify-center"
            onClick={onClick}
          >
            <GitHubSVG height="24" width="24" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>MCP Server Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Thread() {
  const [artifactContext, setArtifactContext] = useArtifactContext();
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

    // close artifact and reset artifact context
    closeArtifact();
    setArtifactContext({});
  };

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
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
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim().length === 0 && contentBlocks.length === 0) || isLoading)
      return;
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

    stream.submit(
      { messages: [...toolMessages, newHumanMessage], context },
      {
        streamMode: ["values"],
        streamSubgraphs: true,
        streamResumable: true,
        optimisticValues: (prev) => ({
          ...prev,
          context,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      }
    );

    setInput("");
    setContentBlocks([]);
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined
  ) => {
    // Do this so the loading state is correct
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      streamSubgraphs: true,
      streamResumable: true,
    });
  };

  const chatStarted = !!threadId || !!messages.length;
  const hasNoAiOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool"
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative hidden lg:flex">
        <motion.div
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -300 }
              : { x: chatHistoryOpen ? 0 : -300 }
          }
          className="absolute z-20 h-full overflow-hidden border-r bg-white"
          initial={{ x: -300 }}
          style={{ width: 300 }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full" style={{ width: 300 }}>
            <ThreadHistory />
          </div>
        </motion.div>
      </div>

      <div
        className={cn(
          "grid w-full grid-cols-[1fr_0fr] transition-all duration-500",
          artifactOpen && "grid-cols-[3fr_2fr]"
        )}
      >
        <motion.div
          animate={{
            marginLeft: chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0,
            width: chatHistoryOpen
              ? isLargeScreen
                ? "calc(100% - 300px)"
                : "100%"
              : "100%",
          }}
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-hidden",
            !chatStarted && "grid-rows-[1fr]"
          )}
          layout={isLargeScreen}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
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
                    marginLeft: chatHistoryOpen ? 0 : 48,
                  }}
                  className="flex cursor-pointer items-center gap-2"
                  onClick={() => setThreadId(null)}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <LangGraphLogoSVG height={32} width={32} />
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

              <div className="absolute inset-x-0 top-full h-5 bg-gradient-to-b from-background to-background/0" />
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
                  {(() => {
                    // Filter messages first
                    const filteredMessages = messages
                      .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                      .filter((m) => {
                        const filtered = filterSubagentResponses([m]);
                        return filtered.length > 0;
                      });

                    // Group research and critique agent messages
                    const researchGroups =
                      groupResearchAgentMessages(filteredMessages);
                    const critiqueGroups =
                      groupCritiqueAgentMessages(filteredMessages);

                    // Track which indices have been processed
                    const processedIndices = new Set<number>();
                    const result: React.ReactElement[] = [];

                    // Collect all timeline activities to render them in a single timeline
                    const allTimelineActivities: Array<{
                      key: string;
                      messages: Message[];
                      startIndex: number;
                      endIndex: number;
                    }> = [];

                    // First pass: collect all timeline activities
                    filteredMessages.forEach((message, index) => {
                      // Check if this is the start of a research group
                      if (
                        researchGroups.length > 0 &&
                        index === researchGroups[0].startIndex
                      ) {
                        allTimelineActivities.push({
                          key: "research-agents-timeline",
                          messages: filteredMessages.slice(
                            researchGroups[0].startIndex,
                            researchGroups[researchGroups.length - 1].endIndex +
                              1
                          ),
                          startIndex: researchGroups[0].startIndex,
                          endIndex:
                            researchGroups[researchGroups.length - 1].endIndex,
                        });

                        // Mark all research-related messages as processed
                        researchGroups.forEach((group) => {
                          for (
                            let i = group.startIndex;
                            i <= group.endIndex;
                            i++
                          ) {
                            processedIndices.add(i);
                          }
                        });
                        return;
                      }

                      // Check if this is the start of a critique group
                      if (
                        critiqueGroups.length > 0 &&
                        index === critiqueGroups[0].startIndex
                      ) {
                        allTimelineActivities.push({
                          key: "critique-agents-timeline",
                          messages: filteredMessages.slice(
                            critiqueGroups[0].startIndex,
                            critiqueGroups[critiqueGroups.length - 1].endIndex +
                              1
                          ),
                          startIndex: critiqueGroups[0].startIndex,
                          endIndex:
                            critiqueGroups[critiqueGroups.length - 1].endIndex,
                        });

                        // Mark all critique-related messages as processed
                        critiqueGroups.forEach((group) => {
                          for (
                            let i = group.startIndex;
                            i <= group.endIndex;
                            i++
                          ) {
                            processedIndices.add(i);
                          }
                        });
                        return;
                      }

                      // Skip if this message is part of a processed group
                      if (processedIndices.has(index)) {
                        return;
                      }

                      // Process AI messages with tool calls
                      if (
                        message.type === "ai" &&
                        message.tool_calls &&
                        message.tool_calls.length > 0
                      ) {
                        // Find the end of this AI message's tool activities
                        let endIndex = index;
                        for (
                          let i = index + 1;
                          i < filteredMessages.length;
                          i++
                        ) {
                          if (
                            filteredMessages[i].type === "human" ||
                            filteredMessages[i].type === "ai"
                          ) {
                            break;
                          }
                          endIndex = i;
                        }

                        allTimelineActivities.push({
                          key: `timeline-${index}`,
                          messages: filteredMessages.slice(index, endIndex + 1),
                          startIndex: index,
                          endIndex,
                        });

                        // Mark these messages as processed
                        for (let i = index; i <= endIndex; i++) {
                          processedIndices.add(i);
                        }
                        return;
                      }
                    });

                    // Second pass: render everything in chronological order
                    let timelineActivityIndex = 0;
                    filteredMessages.forEach((message, index) => {
                      // Check if this is the start of a timeline activity
                      if (
                        timelineActivityIndex < allTimelineActivities.length &&
                        index ===
                          allTimelineActivities[timelineActivityIndex]
                            .startIndex
                      ) {
                        // Render the timeline activity
                        const activity =
                          allTimelineActivities[timelineActivityIndex];
                        result.push(
                          <TimelineAdapter
                            isLast={
                              timelineActivityIndex ===
                              allTimelineActivities.length - 1
                            }
                            key={activity.key}
                            messages={activity.messages}
                          />
                        );
                        timelineActivityIndex++;

                        // Skip to the end of this activity
                        index = activity.endIndex;
                        return;
                      }

                      // Skip if this message is part of a processed group
                      if (processedIndices.has(index)) {
                        return;
                      }

                      // Render individual message
                      const stableKey = `${message.type}-${index}`;

                      result.push(
                        message.type === "human" ? (
                          <HumanMessage
                            isLoading={isLoading}
                            key={stableKey}
                            message={message}
                          />
                        ) : (
                          <AssistantMessage
                            handleRegenerate={handleRegenerate}
                            isLoading={isLoading}
                            key={stableKey}
                            message={message}
                          />
                        )
                      );
                    });

                    return result;
                  })()}
                  {/* Special rendering case where there are no AI/tool messages, but there is an interrupt.
                    We need to render it outside of the messages list, since there are no messages to render */}
                  {hasNoAiOrToolMessages && !!stream.interrupt && (
                    <AssistantMessage
                      handleRegenerate={handleRegenerate}
                      isLoading={isLoading}
                      key="interrupt-msg"
                      message={undefined}
                    />
                  )}
                  {isLoading && !firstTokenReceived && (
                    <AssistantMessageLoading />
                  )}
                </>
              }
              contentClassName="pt-8 pb-16  max-w-3xl mx-auto flex flex-col gap-4 w-full"
              footer={
                <div className="sticky bottom-0 flex flex-col items-center gap-8 bg-white">
                  {!chatStarted && (
                    <div className="flex items-center gap-3">
                      <LangGraphLogoSVG className="h-8 flex-shrink-0" />
                      <h1 className="font-semibold text-2xl tracking-tight">
                        Agent Chat
                      </h1>
                    </div>
                  )}

                  <ScrollToBottom className="fade-in-0 zoom-in-95 -translate-x-1/2 absolute bottom-full left-1/2 mb-4 animate-in" />

                  <div
                    className={cn(
                      "relative z-10 mx-auto mb-8 w-full max-w-3xl rounded-2xl bg-muted shadow-xs transition-all",
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
                        className="field-sizing-content resize-none border-none bg-transparent p-3.5 pb-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.metaKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            const el = e.target as HTMLElement | undefined;
                            const form = el?.closest("form");
                            form?.requestSubmit();
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
        </motion.div>
        <div className="relative flex flex-col border-l">
          <div className="absolute inset-0 flex min-w-[30vw] flex-col">
            <div className="grid grid-cols-[1fr_auto] border-b p-4">
              <ArtifactTitle className="overflow-hidden truncate" />
              <button className="cursor-pointer" onClick={closeArtifact}>
                <XIcon className="size-5" />
              </button>
            </div>
            <ArtifactContent className="relative flex-grow" />
          </div>
        </div>
      </div>
    </div>
  );
}
