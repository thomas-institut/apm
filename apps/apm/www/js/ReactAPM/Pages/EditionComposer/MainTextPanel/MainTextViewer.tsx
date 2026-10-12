import {MainText} from "@/Edition/MainText";
import {MainTextToken} from "@/Edition/MainTextToken";
import {MainTextParagraph} from "@/Edition/MainTextParagraph";
import * as EditionMainTextTokenType from "@/Edition/MainTextTokenType";
import {MouseEvent as ReactMouseEvent, ReactElement, useEffect, useLayoutEffect, useRef, useState} from "react";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";
import {OverlayTrigger} from "react-bootstrap";
import {Apparatus} from "@/Edition/Apparatus";
import MainTextApparatusPopover, {
  MainTextApparatusEntryReference
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextApparatusPopover";
import {
  ApparatusHighlightSelection,
  MainTextEditMode
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanelToolbar";
import {
  EditionWitnessIndexToCtIndexMap
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionWitnessIndexToCtIndexMap";


/**
 * A map from the index of a token in the main text to the display line number.
 */
export type MainTextIndexToLineMap = Map<number, number>;

export interface MainTextTokenRange {
  from: number;
  to: number;
}

interface MainTextViewerProps {
  mainText: MainTextToken[],
  indexMap: EditionWitnessIndexToCtIndexMap,
  className?: string,
  highlightedTokenRange?: MainTextTokenRange | null,
  selectedTokenRange?: MainTextTokenRange | null,
  mode?: MainTextEditMode,
  canSelectTokens?: boolean,
  apparatuses?: Apparatus[],
  activeApparatusIndex?: number | null,
  apparatusHighlightSelection?: ApparatusHighlightSelection,
  sigla?: string[],
  showApparatusPopovers?: boolean,
  onHoverApparatusEntries?: (entries: MainTextApparatusEntryReference[] | null) => void,
  onSelectionChange?: (range: MainTextTokenRange | null) => void,
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

export default function MainTextViewer({mainText, indexMap, className = '', highlightedTokenRange = null,
                                        selectedTokenRange = null,
                                        mode = 'off', canSelectTokens = false, apparatuses = [], sigla = [],
                                        activeApparatusIndex = null,
                                        apparatusHighlightSelection = 'active', showApparatusPopovers = true,
                                        onHoverApparatusEntries, onSelectionChange,
                                        onLineNumberingChange}: MainTextViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const previousLineNumbering = useRef<MainTextIndexToLineMap | null>(null);
  const selectionAnchor = useRef<number | null>(null);
  const [dragSelection, setDragSelection] = useState<MainTextTokenRange | null>(null);
  const [lineLabels, setLineLabels] = useState<Array<{lineNumber: number, top: number}>>([]);
  const [lineNumbersByToken, setLineNumbersByToken] = useState<MainTextIndexToLineMap>(new Map());
  let paragraphs = MainText.getParagraphs(mainText);

  const updateDragSelection = (range: MainTextTokenRange | null) => {
    setDragSelection(range);
    onSelectionChange?.(range);
  };

  useEffect(() => {
    if (mode !== 'apparatus') {
      selectionAnchor.current = null;
      updateDragSelection(null);
    }
  }, [mode]);

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
        setLineNumbersByToken(lineNumbering);
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

  const getApparatusEntriesForToken = (tokenIndex: number): MainTextApparatusEntryReference[] => {
    const entries: MainTextApparatusEntryReference[] = [];
    apparatuses.forEach((apparatus, apparatusIndex) => {
      apparatus.entries.forEach((entry, entryIndex) => {
        if (tokenIndex >= entry.from && tokenIndex <= entry.to) {
          entries.push({apparatusIndex, entryIndex});
        }
      });
    });
    return entries;
  };

  const getParagraph = (paragraph: MainTextParagraph, parIndex: number) => {
    return paragraph.tokens.map((token, tokenIndex) => {
      const key = [parIndex, tokenIndex].join('-');
      const originalIndex = token.originalIndex;
      const isHighlighted = highlightedTokenRange !== null && token.originalIndex !== undefined &&
        token.originalIndex >= Math.min(highlightedTokenRange.from, highlightedTokenRange.to) &&
        token.originalIndex <= Math.max(highlightedTokenRange.from, highlightedTokenRange.to);
      const currentSelection = dragSelection ?? selectedTokenRange;
      const isSelected = currentSelection !== null && token.originalIndex !== undefined &&
        token.originalIndex >= Math.min(currentSelection.from, currentSelection.to) &&
        token.originalIndex <= Math.max(currentSelection.from, currentSelection.to);
      const apparatusEntries = originalIndex === undefined ? [] : getApparatusEntriesForToken(originalIndex);
      const highlightApparatusIndex = apparatusHighlightSelection === 'active' ? activeApparatusIndex :
        typeof apparatusHighlightSelection === 'number' ? apparatusHighlightSelection : null;
      const isApparatusCovered = originalIndex !== undefined && (apparatusHighlightSelection === 'all'
        ? apparatusEntries.length > 0
        : highlightApparatusIndex !== null && (apparatuses[highlightApparatusIndex]?.entries.some(entry =>
          originalIndex >= entry.from && originalIndex <= entry.to) ?? false));
      const isWhitespace = token.type === EditionMainTextTokenType.GLUE;
      const handleMouseDown = (event: ReactMouseEvent<HTMLSpanElement>) => {
        if (mode !== 'apparatus' || !canSelectTokens) {
          return;
        }
        event.preventDefault();
        if (isWhitespace || originalIndex === undefined) {
          selectionAnchor.current = null;
          updateDragSelection(null);
          return;
        }
        selectionAnchor.current = originalIndex;
        updateDragSelection({from: originalIndex, to: originalIndex});
      };
      const handleMouseEnter = () => {
        if (mode === 'apparatus' && canSelectTokens && selectionAnchor.current !== null) {
          if (!isWhitespace && originalIndex !== undefined) {
            updateDragSelection({from: selectionAnchor.current, to: originalIndex});
          }
          return;
        }
        if (mode !== 'text') {
          onHoverApparatusEntries?.(apparatusEntries.length > 0 ? apparatusEntries : null);
        }
      };
      const handleMouseLeave = () => {
        if (selectionAnchor.current === null) {
          onHoverApparatusEntries?.(null);
        }
      };
      const wrapWithPopover = (element: ReactElement) => {
        if (!showApparatusPopovers || mode === 'text' || apparatusEntries.length === 0) {
          return element;
        }
        return <OverlayTrigger key={key} trigger={['hover', 'focus']} placement="bottom"
                              overlay={<MainTextApparatusPopover apparatuses={apparatuses}
                                                                entryReferences={apparatusEntries}
                                                                sigla={sigla} tokenIndex={originalIndex ?? -1}
                                                                tokenText={token.getPlainText()}
                                                                lineNumber={originalIndex === undefined ? undefined :
                                                                  lineNumbersByToken.get(originalIndex)}/>}>{element}</OverlayTrigger>;
      };
      switch (token.type) {
        case EditionMainTextTokenType.GLUE:
          const glueClasses = [MTT, `${MTT_ORIG}${token.originalIndex}`, WS];
          if (isApparatusCovered && mode !== 'text') {
            glueClasses.push('apparatus-coverage-highlighted');
          }
          if (isHighlighted) {
            glueClasses.push('highlighted-token');
          }
          if (isSelected) {
            glueClasses.push('selected-token');
          }
          return wrapWithPopover(<span className={glueClasses.join(' ')} key={key}
                                     onMouseDown={handleMouseDown}
                                     onMouseEnter={handleMouseEnter}
                                     onMouseLeave={handleMouseLeave}> </span>);

        case EditionMainTextTokenType.TEXT:
        case EditionMainTextTokenType.NUMBERING_LABEL:
        case EditionMainTextTokenType.FOLIATION_CHANGE_MARKER:
          const ctIndex = indexMap[token.editionWitnessTokenIndex];
          const typeClass = token.type === EditionMainTextTokenType.TEXT ? [] : [NL];
          const tokenClasses = [MTT, `${MTT_ORIG}${token.originalIndex}`, `${CTI}${ctIndex}`, ...typeClass];
          if (isApparatusCovered) {
            tokenClasses.push('token-in-apparatus');
            if (mode !== 'text') {
              tokenClasses.push('apparatus-coverage-highlighted');
            }
          }
          if (isHighlighted) {
            tokenClasses.push('highlighted-token');
          }
          if (isSelected) {
            tokenClasses.push('selected-token');
          }
          return wrapWithPopover(<span className={tokenClasses.join(' ')} key={key}
                                     onMouseDown={handleMouseDown}
                                     onMouseEnter={handleMouseEnter}
                                     onMouseLeave={handleMouseLeave}><FmtTextRenderer t={token.fmtText}
                                                                                    key={tokenIndex}/></span>);

        default:
          return null;
      }
    });
  }
  const handleViewerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (mode === 'apparatus' && canSelectTokens && !(event.target instanceof Element && event.target.closest(`.${MTT}`))) {
      selectionAnchor.current = null;
      updateDragSelection(null);
    }
  };

  return <div className={className} ref={viewerRef} onMouseDown={handleViewerMouseDown}
              onMouseUp={() => { selectionAnchor.current = null; }}
              onMouseLeave={() => { selectionAnchor.current = null; onHoverApparatusEntries?.(null); }}>
    {lineLabels.map(({lineNumber, top}) => <span className="main-text-line-number" key={lineNumber} style={{top}}>{lineNumber}</span>)}
    {paragraphs.map((paragraph, index) => {
      return <p className={paragraph.type} key={index}>{getParagraph(paragraph, index)}</p>;
    })}
  </div>

}