import type { Base64ContentBlock } from "@/types";
import type React from "react";
import { cn } from "@/lib/utils";
import { MultimodalPreview } from "./MultimodalPreview";

type ContentBlocksPreviewProps = {
  blocks: Base64ContentBlock[];
  onRemove: (idx: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Renders a preview of content blocks with optional remove functionality.
 * Uses cn utility for robust class merging.
 */
export const ContentBlocksPreview: React.FC<ContentBlocksPreviewProps> = ({
  blocks,
  onRemove,
  size = "md",
  className,
}) => {
  if (!blocks.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2 p-3.5 pb-0", className)}>
      {blocks.map((block, idx) => (
        <MultimodalPreview
          block={block}
          key={`block-${idx}-${block.mime_type || "unknown"}`}
          onRemove={() => onRemove(idx)}
          removable
          size={size}
        />
      ))}
    </div>
  );
};
