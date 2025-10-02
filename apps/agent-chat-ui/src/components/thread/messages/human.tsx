import type { Message } from "@langchain/langgraph-sdk";
import { useState } from "react";
import { MultimodalPreview } from "@/components/thread/MultimodalPreview";
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      className="focus-visible:ring-0"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      value={value}
    />
  );
}

export function HumanMessage({
  message,
  isLoading,
}: {
  message: Message;
  isLoading: boolean;
}) {
  const thread = useStreamContext();
  const meta = thread.getMessagesMetadata(message);
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const contentString = getContentString(message.content);

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
        "group ml-auto flex items-center gap-2",
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
            {/* Render images and files if no text */}
            {Array.isArray(message.content) && message.content.length > 0 && (
              <div className="flex flex-wrap items-end justify-end gap-2">
                {message.content.reduce<React.ReactNode[]>((acc, block) => {
                  if (isBase64ContentBlock(block)) {
                    const uniqueKey = `block-${acc.length}`;
                    acc.push(
                      <MultimodalPreview
                        block={block}
                        key={uniqueKey}
                        size="md"
                      />
                    );
                  }
                  return acc;
                }, [])}
              </div>
            )}
            {/* Render text if present, otherwise fallback to file/image name */}
            {contentString ? (
              <p className="ml-auto w-fit whitespace-pre-wrap rounded-3xl bg-muted px-4 py-2 text-right">
                {contentString}
              </p>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            "ml-auto flex items-center gap-2 transition-opacity",
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
