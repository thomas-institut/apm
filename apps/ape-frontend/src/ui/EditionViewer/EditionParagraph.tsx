import React from "react";
import {MainTextToken} from "@shared/ts";
import {fromCompactFmtText} from "@thomas-inst/fmt-text";
import {FmtTextSpan} from "@/ui/EditionViewer/FmtTextSpan";

export interface EntrySpec {
  apparatus: string;
  entryIndex: number;
}

export interface DisplayMainTextToken extends MainTextToken {
  originalIndex: number;
  entries: EntrySpec[];
}

export interface MainTextParagraph {
  style: string;
  tokens: DisplayMainTextToken[];
}

interface EditionParagraphProps {
  paragraph: MainTextParagraph;
  highlightedToken: number | null;
  onTokenClick: (index: number) => void;
}

export const EditionParagraph = React.memo(({paragraph, highlightedToken, onTokenClick}: EditionParagraphProps) => {
  return (
    <p className={paragraph.style}>
      {paragraph.tokens.map((token, index) => {
        let className = `main-text-token main-text-token-${token.originalIndex} `
          + token.entries.map(entry => `entry-${entry.apparatus} entry-${entry.apparatus}-${entry.entryIndex}`).join(' ');

        if (token.originalIndex === highlightedToken) {
          className += ' highlighted-token';
        }
        return (
          <span key={index} className={className} onClick={() => onTokenClick(token.originalIndex)}>
            <FmtTextSpan fmtText={fromCompactFmtText(token.text)}/>
          </span>
        );
      })}
    </p>
  );
});

EditionParagraph.displayName = 'EditionParagraph';
