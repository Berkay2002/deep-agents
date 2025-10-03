import type { Message } from "@langchain/langgraph-sdk";
import { useState } from "react";
import { MultimodalPreview } from "@/components/thread/multimodal-preview";
import { Textarea } from "@/components/ui/textarea";
import { isBase64ContentBlock } from "@/lib/multimodal-utils";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";

function EditableContent({
  value,
  setValue,
  onSubmit,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      className="focus-visible:ring-0"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      value={value}
    />
  );
}

export function HumanMessage({
  message,
  isLoading,
  alignment = "right",
}: {
  message: Message;
  isLoading: boolean;
  alignment?: "left" | "right";
}) {
  const thread = useStreamContext();
  const meta = thread.getMessagesMetadata(message);
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const contentString = getContentString(message.content);
  const isLeftAligned = alignment === "left";

  const handleSubmitEdit = () => {
    setIsEditing(false);

    const newMessage: Message = { type: "human", content: value };
    thread.submit(
      { messages: [newMessage] },
      {
        checkpoint: parentCheckpoint,
        streamMode: ["values"],
        streamSubgraphs: true,
        streamResumable: true,
        optimisticValues: (prev) => {
          const values = meta?.firstSeenState?.values;
          if (!values) {
            return prev;
          }

          return {
            ...values,
            messages: [...(values.messages ?? []), newMessage],
          };
        },
      }
    );
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2",
        isLeftAligned ? "mr-auto" : "ml-auto",
        isEditing && "w-full max-w-xl"
      )}
    >
      <div className={cn("flex flex-col gap-2", isEditing && "w-full")}>
        {isEditing ? (
          <EditableContent
            onSubmit={handleSubmitEdit}
            setValue={setValue}
            value={value}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {Array.isArray(message.content) && message.content.length > 0 && (
              <div
                className={cn(
                  "flex flex-wrap items-end gap-2",
                  isLeftAligned ? "justify-start" : "justify-end"
                )}
              >
                {message.content.reduce<React.ReactNode[]>((acc, block) => {
                  if (isBase64ContentBlock(block)) {
                    acc.push(
                      <MultimodalPreview
                        block={block}
                        key={JSON.stringify(block)}
                        size="md"
                      />
                    );
                  }
                  return acc;
                }, [])}
              </div>
            )}
            {contentString ? (
              <p
                className={cn(
                  "w-fit whitespace-pre-wrap rounded-3xl bg-muted px-4 py-2",
                  isLeftAligned ? "mr-auto text-left" : "ml-auto text-right"
                )}
              >
                {contentString}
              </p>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2 transition-opacity",
            isLeftAligned ? "mr-auto" : "ml-auto",
            "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
            isEditing && "opacity-100"
          )}
        >
          <BranchSwitcher
            branch={meta?.branch}
            branchOptions={meta?.branchOptions}
            isLoading={isLoading}
            onSelect={(branch) => thread.setBranch(branch)}
          />
          <CommandBar
            content={contentString}
            handleSubmitEdit={handleSubmitEdit}
            isEditing={isEditing}
            isHumanMessage={true}
            isLoading={isLoading}
            setIsEditing={(shouldEdit) => {
              if (shouldEdit) {
                setValue(contentString);
              }
              setIsEditing(shouldEdit);
            }}
          />
        </div>
      </div>
    </div>
  );
}
