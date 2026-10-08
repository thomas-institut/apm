import {MainText} from "@/Edition/MainText";
import {MainTextToken} from "@/Edition/MainTextToken";
import {MainTextParagraph} from "@/Edition/MainTextParagraph";
import * as EditionMainTextTokenType from "@/Edition/MainTextTokenType";
import {useLayoutEffect, useRef, useState} from "react";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";
import {
  EditionWitnessIndexToCtIndexMap
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionWitnessIndexToCtIndexMap";


/**
 * A map from the index of a token in the main text to the display line number.
 */
export type MainTextIndexToLineMap = Map<number, number>;

interface MainTextViewerProps {
  mainText: MainTextToken[],
  indexMap: EditionWitnessIndexToCtIndexMap,
  className?: string,
  onLineNumberingChange?: (lineNumbering: MainTextIndexToLineMap) => void | Promise<void>
}

const MTT = 'mtt';
const MTT_ORIG = 'mtt-';
const CTI = 'cti-';
const WS = 'whitespace';
const NL = 'numbering-label';

const lineNumberingsAreEqual = (first: MainTextIndexToLineMap, second: MainTextIndexToLineMap): boolean => {
  if (first.size !== second.size) {
    return false;
  }
  for (const [index, lineNumber] of first) {
    if (second.get(index) !== lineNumber) {
      return false;
    }
  }
  return true;
};

export default function MainTextViewer({mainText, indexMap, className = '', onLineNumberingChange}: MainTextViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const previousLineNumbering = useRef<MainTextIndexToLineMap | null>(null);
  const [lineLabels, setLineLabels] = useState<Array<{lineNumber: number, top: number}>>([]);
  let paragraphs = MainText.getParagraphs(mainText);

  useLayoutEffect(() => {
    const viewer = viewerRef.current;
    if (viewer === null) {
      return;
    }

    const updateLineNumbering = () => {
      const tokenPositions: Array<{index: number, top: number}> = [];
      viewer.querySelectorAll<HTMLSpanElement>(`span[class*="${MTT_ORIG}"]`).forEach((span) => {
        const originalIndexClass = Array.from(span.classList).find(className => className.startsWith(MTT_ORIG));
        if (originalIndexClass === undefined) {
          return;
        }

        const index = Number.parseInt(originalIndexClass.slice(MTT_ORIG.length), 10);
        if (!Number.isInteger(index)) {
          return;
        }

        tokenPositions.push({index, top: span.getBoundingClientRect().top});
      });

      const lineTops = Array.from(new Set(tokenPositions.map(({top}) => top))).sort((first, second) => first - second);
      const lineNumbersByTop = new Map(lineTops.map((top, index) => [top, index + 1]));
      const lineNumbering: MainTextIndexToLineMap = new Map();
      tokenPositions.forEach(({index, top}) => {
        const lineNumber = lineNumbersByTop.get(top);
        if (lineNumber !== undefined) {
          lineNumbering.set(index, lineNumber);
        }
      });

      const viewerTop = viewer.getBoundingClientRect().top;
      setLineLabels(lineTops.flatMap((top, index) => {
        const lineNumber = index + 1;
        return lineNumber === 1 || lineNumber % 5 === 0 ? [{lineNumber, top: top - viewerTop}] : [];
      }));

      if (previousLineNumbering.current === null || !lineNumberingsAreEqual(previousLineNumbering.current, lineNumbering)) {
        previousLineNumbering.current = lineNumbering;
        onLineNumberingChange?.(lineNumbering);
      }
    };

    updateLineNumbering();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(updateLineNumbering);
    resizeObserver.observe(viewer);
    return () => resizeObserver.disconnect();
  }, [mainText, indexMap, className, onLineNumberingChange]);

  const getParagraph = (paragraph: MainTextParagraph, parIndex: number) => {
    return paragraph.tokens.map((token, tokenIndex) => {
      const key = [parIndex, tokenIndex].join('-');
      switch (token.type) {
        case EditionMainTextTokenType.GLUE:
          const glueClasses = [MTT, `${MTT_ORIG}${token.originalIndex}`, WS];
          return <span className={glueClasses.join(' ')} key={key}> </span>

        case EditionMainTextTokenType.TEXT:
        case EditionMainTextTokenType.NUMBERING_LABEL:
        case EditionMainTextTokenType.FOLIATION_CHANGE_MARKER:
          const ctIndex = indexMap[token.editionWitnessTokenIndex];
          const typeClass = token.type === EditionMainTextTokenType.TEXT ? [] : [NL];
           const tokenClasses = [MTT, `${MTT_ORIG}${token.originalIndex}`, `${CTI}${ctIndex}`, ...typeClass];
          return <span className={tokenClasses.join(' ')} key={key}><FmtTextRenderer t={token.fmtText} key={tokenIndex}/></span>

        default:
          return null;
      }
    });
  }
  return <div className={className} ref={viewerRef}>
    {lineLabels.map(({lineNumber, top}) => <span className="main-text-line-number" key={lineNumber} style={{top}}>{lineNumber}</span>)}
    {paragraphs.map((paragraph, index) => {
      return <p className={paragraph.type} key={index}>{getParagraph(paragraph, index)}</p>;
    })}
  </div>

}