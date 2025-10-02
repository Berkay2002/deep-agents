import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyCheck,
  Pencil,
  RefreshCcw,
  SendHorizontal,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "../tooltip-icon-button";

const COPY_RESET_DELAY = 2000;

function ContentCopyable({
  content,
  disabled,
}: {
  content: string;
  disabled: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_DELAY);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_DELAY);
    }
  };

  return (
    <TooltipIconButton
      disabled={disabled}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      tooltip="Copy content"
      variant="ghost"
    >
      <AnimatePresence initial={false} mode="wait">
        {copied ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="check"
            transition={{ duration: 0.15 }}
          >
            <CopyCheck className="text-green-500" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="copy"
            transition={{ duration: 0.15 }}
          >
            <Copy />
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipIconButton>
  );
}

export function BranchSwitcher({
  branch,
  branchOptions,
  onSelect,
  isLoading,
}: {
  branch: string | undefined;
  branchOptions: string[] | undefined;
  onSelect: (branch: string) => void;
  isLoading: boolean;
}) {
  if (!(branchOptions && branch)) {
    return null;
  }
  const index = branchOptions.indexOf(branch);

  return (
    <div className="flex items-center gap-2">
      <Button
        className="size-6 p-1"
        disabled={isLoading}
        onClick={() => {
          const prevBranch = branchOptions[index - 1];
          if (!prevBranch) {
            return;
          }
          onSelect(prevBranch);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const prevBranch = branchOptions[index - 1];
            if (!prevBranch) {
              return;
            }
            onSelect(prevBranch);
          }
        }}
        size="icon"
        variant="ghost"
        type="button"
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm">
        {index + 1} / {branchOptions.length}
      </span>
      <Button
        className="size-6 p-1"
        disabled={isLoading}
        onClick={() => {
          const nextBranch = branchOptions[index + 1];
          if (!nextBranch) {
            return;
          }
          onSelect(nextBranch);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const nextBranch = branchOptions[index + 1];
            if (!nextBranch) {
              return;
            }
            onSelect(nextBranch);
          }
        }}
        size="icon"
        variant="ghost"
        type="button"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export function CommandBar({
  content,
  isHumanMessage,
  isAiMessage,
  isEditing,
  setIsEditing,
  handleSubmitEdit,
  handleRegenerate,
  isLoading,
  hideButtons = false,
}: {
  content: string;
  isHumanMessage?: boolean;
  isAiMessage?: boolean;
  isEditing?: boolean;
  setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmitEdit?: () => void;
  handleRegenerate?: () => void;
  isLoading: boolean;
  hideButtons?: boolean;
}) {
  if (isHumanMessage && isAiMessage) {
    throw new Error(
      "Can only set one of isHumanMessage or isAiMessage to true, not both."
    );
  }

  if (!(isHumanMessage || isAiMessage)) {
    throw new Error(
      "One of isHumanMessage or isAiMessage must be set to true."
    );
  }

  if (
    isHumanMessage &&
    (isEditing === undefined ||
      setIsEditing === undefined ||
      handleSubmitEdit === undefined)
  ) {
    throw new Error(
      "If isHumanMessage is true, all of isEditing, setIsEditing, and handleSubmitEdit must be set."
    );
  }

  const showEdit =
    isHumanMessage &&
    isEditing !== undefined &&
    !!setIsEditing &&
    !!handleSubmitEdit;

  if (isHumanMessage && isEditing && !!setIsEditing && !!handleSubmitEdit) {
    return (
      <div className="flex items-center gap-2">
        <TooltipIconButton
          disabled={isLoading}
          onClick={() => {
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditing(false);
            }
          }}
          tooltip="Cancel edit"
          variant="ghost"
        >
          <XIcon />
        </TooltipIconButton>
        <TooltipIconButton
          disabled={isLoading}
          onClick={handleSubmitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSubmitEdit();
            }
          }}
          tooltip="Submit"
          variant="secondary"
        >
          <SendHorizontal />
        </TooltipIconButton>
      </div>
    );
  }

  // If hideButtons is true, render nothing
  if (hideButtons) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <ContentCopyable content={content} disabled={isLoading} />
      {isAiMessage && !!handleRegenerate && (
        <TooltipIconButton
          disabled={isLoading}
          onClick={handleRegenerate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleRegenerate();
            }
          }}
          tooltip="Refresh"
          variant="ghost"
        >
          <RefreshCcw />
        </TooltipIconButton>
      )}
      {showEdit && (
        <TooltipIconButton
          disabled={isLoading}
          onClick={() => {
            setIsEditing?.(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditing?.(true);
            }
          }}
          tooltip="Edit"
          variant="ghost"
        >
          <Pencil />
        </TooltipIconButton>
      )}
    </div>
  );
}
