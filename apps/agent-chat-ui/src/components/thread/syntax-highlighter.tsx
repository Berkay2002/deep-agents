import type { FC } from "react";
import { Prism as SyntaxHighlighterPrism } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SyntaxHighlighterProps {
  children: string;
  language: string;
  className?: string;
}

export const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
  children,
  language,
  className,
}) => (
  <SyntaxHighlighterPrism
    className={className}
    customStyle={{
      margin: 0,
      width: "100%",
      background: "transparent",
      padding: "1.5rem 1rem",
    }}
    language={language}
    style={coldarkDark}
  >
    {children}
  </SyntaxHighlighterPrism>
);
