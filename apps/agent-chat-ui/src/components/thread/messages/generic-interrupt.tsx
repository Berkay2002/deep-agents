import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

// Constants for magic numbers
const MAX_CONTENT_LINES = 4;
const MAX_CONTENT_LENGTH = 500;
const MAX_STRING_LENGTH = 100;
const MAX_ARRAY_ITEMS = 5;

function isComplexValue(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

function isUrl(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  try {
    new URL(value);
    return value.startsWith("http://") || value.startsWith("https://");
  } catch {
    return false;
  }
}

function renderInterruptStateItem(value: unknown): React.ReactNode {
  if (isComplexValue(value)) {
    return (
      <code className="rounded bg-gray-50 px-2 py-1 font-mono text-sm">
        {JSON.stringify(value, null, 2)}
      </code>
    );
  }
  if (isUrl(value)) {
    return (
      <a
        className="break-all text-blue-600 underline hover:text-blue-800"
        href={value as string}
        rel="noopener noreferrer"
        target="_blank"
      >
        {String(value)}
      </a>
    );
  }
  return String(value);
}

export function GenericInterruptView({
  interrupt,
}: {
  interrupt: Record<string, unknown> | Record<string, unknown>[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const contentStr = JSON.stringify(interrupt, null, 2);
  const contentLines = contentStr.split("\n");
  const shouldTruncate = contentLines.length > MAX_CONTENT_LINES || contentStr.length > MAX_CONTENT_LENGTH;

  // Function to truncate long string values (but preserve URLs)
  const truncateValue = (value: unknown): unknown => {
    if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
      // Don't truncate URLs so they remain clickable
      if (isUrl(value)) {
        return value;
      }
      return `${value.slice(0, MAX_STRING_LENGTH)}...`;
    }

    if (Array.isArray(value) && !isExpanded) {
      return value.slice(0, 2).map(truncateValue);
    }

    if (isComplexValue(value) && !isExpanded) {
      const strValue = JSON.stringify(value, null, 2);
      if (strValue.length > MAX_STRING_LENGTH) {
        // Return plain text for truncated content instead of a JSON object
        return `Truncated ${strValue.length} characters...`;
      }
    }

    return value;
  };

  // Process entries based on expanded state
  const processEntries = () => {
    if (Array.isArray(interrupt)) {
      return isExpanded ? interrupt : interrupt.slice(0, MAX_ARRAY_ITEMS);
    }
    const entries = Object.entries(interrupt);
    if (!isExpanded && shouldTruncate) {
      // When collapsed, process each value to potentially truncate it
      return entries.map(([key, value]) => [key, truncateValue(value)]);
    }
    return entries;
  };

  const displayEntries = processEntries();

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="border-gray-200 border-b bg-gray-50 px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-gray-900">Human Interrupt</h3>
        </div>
      </div>
      <motion.div
        animate={{ height: "auto" }}
        className="min-w-full bg-gray-100"
        initial={false}
        transition={{ duration: 0.3 }}
      >
        <div className="p-3">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key={isExpanded ? "expanded" : "collapsed"}
              style={{
                maxHeight: isExpanded ? "none" : "500px",
                overflow: "auto",
              }}
              transition={{ duration: 0.2 }}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                  {displayEntries.map((item, argIdx) => {
                    const [key, value] = Array.isArray(interrupt)
                      ? [argIdx.toString(), item]
                      : (item as [string, unknown]);
                    // Create a unique key using the key/value combination
                    const uniqueKey = `${key}-${JSON.stringify(value)}`;
                    return (
                      <tr key={uniqueKey}>
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-sm">
                          {key}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-sm">
                          {renderInterruptStateItem(value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          </AnimatePresence>
        </div>
        {(shouldTruncate ||
          (Array.isArray(interrupt) && interrupt.length > MAX_ARRAY_ITEMS)) && (
          <motion.button
            className="flex w-full cursor-pointer items-center justify-center border-gray-200 border-t-[1px] py-2 text-gray-500 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:text-gray-600"
            initial={{ scale: 1 }}
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
