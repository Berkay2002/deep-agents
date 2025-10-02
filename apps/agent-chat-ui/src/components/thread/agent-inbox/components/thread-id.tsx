import { AnimatePresence, motion } from "framer-motion";
import { Copy, CopyCheck } from "lucide-react";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipIconButton } from "../../tooltip-icon-button";

// Constants
const CHAR_PREVIEW_LENGTH = 3;
const COPY_FEEDBACK_DURATION = 2000;
const ANIMATION_DURATION = 0.15;

export function ThreadIdTooltip({ threadId }: { threadId: string }) {
  const firstThreeChars = threadId.slice(0, CHAR_PREVIEW_LENGTH);
  const lastThreeChars = threadId.slice(-CHAR_PREVIEW_LENGTH);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <p className="rounded-md bg-gray-100 px-1 py-[2px] font-mono text-[10px] leading-[12px] tracking-tighter">
            {firstThreeChars}...{lastThreeChars}
          </p>
        </TooltipTrigger>
        <TooltipContent>
          <ThreadIdCopyable threadId={threadId} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ThreadIdCopyable({
  threadId,
  showUuid = false,
}: {
  threadId: string;
  showUuid?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(threadId);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
  };

  return (
    <TooltipIconButton
      className="flex w-fit grow-0 cursor-pointer items-center gap-1 rounded-md border border-gray-200 p-1 hover:bg-gray-50/90"
      onClick={(e) => handleCopy(e)}
      tooltip="Copy thread ID"
      variant="ghost"
    >
      <p className="font-mono text-xs">{showUuid ? threadId : "ID"}</p>
      <AnimatePresence initial={false} mode="wait">
        {copied ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="check"
            transition={{ duration: ANIMATION_DURATION }}
          >
            <CopyCheck className="h-3 max-h-3 w-3 max-w-3 text-green-500" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            initial={{ opacity: 0, scale: 0.8 }}
            key="copy"
            transition={{ duration: ANIMATION_DURATION }}
          >
            <Copy className="h-3 max-h-3 w-3 max-w-3 text-gray-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipIconButton>
  );
}
