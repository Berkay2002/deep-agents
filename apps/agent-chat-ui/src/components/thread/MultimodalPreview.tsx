import type { Base64ContentBlock } from "@langchain/core/messages";
import { File, X } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { cn } from "@/lib/utils";

export type MultimodalPreviewProps = {
  block: Base64ContentBlock;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const IMAGE_SIZES = {
  sm: { height: 16, width: 16 },
  md: { height: 32, width: 32 },
  lg: { height: 48, width: 48 },
} as const;

const ICON_SIZES = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-7 w-7",
} as const;

export const MultimodalPreview: React.FC<MultimodalPreviewProps> = ({
  block,
  removable = false,
  onRemove,
  className,
  size = "md",
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRemove?.();
    }
  };

  // Image block
  if (
    block.type === "image" &&
    block.source_type === "base64" &&
    typeof block.mime_type === "string" &&
    block.mime_type.startsWith("image/")
  ) {
    const url = `data:${block.mime_type};base64,${block.data}`;
    
    let imgClass: string;
    if (size === "sm") {
      imgClass = "rounded-md object-cover h-10 w-10 text-base";
    } else if (size === "lg") {
      imgClass = "rounded-md object-cover h-24 w-24 text-xl";
    } else {
      imgClass = "rounded-md object-cover h-16 w-16 text-lg";
    }

    const imageSize = IMAGE_SIZES[size];

    return (
      <div className={cn("relative inline-block", className)}>
        <Image
          alt={(block.metadata?.name as string) || "uploaded file"}
          className={imgClass}
          height={imageSize.height}
          src={url}
          width={imageSize.width}
        />
        {removable && (
          <button
            aria-label="Remove file"
            className="absolute top-1 right-1 z-10 rounded-full bg-gray-500 text-white hover:bg-gray-700"
            onClick={onRemove}
            onKeyDown={handleKeyDown}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // PDF block
  if (
    block.type === "file" &&
    block.source_type === "base64" &&
    block.mime_type === "application/pdf"
  ) {
    const filename =
      block.metadata?.filename || block.metadata?.name || "PDF file";
    
    return (
      <div
        className={cn(
          "relative flex items-start gap-2 rounded-md border bg-gray-100 px-3 py-2",
          className
        )}
      >
        <div className="flex flex-shrink-0 flex-col items-start justify-start">
          <File
            className={cn(
              "text-teal-700",
              ICON_SIZES[size]
            )}
          />
        </div>
        <span className="break-all min-w-0 flex-1 text-gray-800 text-sm [word-break:break-all] [white-space:pre-wrap]">
          {(filename as string)}
        </span>
        {removable && (
          <button
            aria-label="Remove PDF"
            className="ml-2 self-start rounded-full bg-gray-200 p-1 text-teal-700 hover:bg-gray-300"
            onClick={onRemove}
            onKeyDown={handleKeyDown}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-gray-100 px-3 py-2 text-gray-500",
        className
      )}
    >
      <File className="h-5 w-5 flex-shrink-0" />
      <span className="truncate text-xs">Unsupported file type</span>
      {removable && (
        <button
          aria-label="Remove file"
          className="ml-2 rounded-full bg-gray-200 p-1 text-gray-500 hover:bg-gray-300"
          onClick={onRemove}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};