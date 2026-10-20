import {Apparatus} from "@/Edition/Apparatus";
import {
  MainTextIndexToLineMap,
  MainTextTokenRange
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {Fragment, useCallback, useMemo, useRef} from "react";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import ApparatusEntryView from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusEntryView";
import {
  QuickEditOutcome,
  QuickEntryOperation
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";


interface ApparatusViewerProps {
  apparatus: Apparatus;
  lineNumberMap: MainTextIndexToLineMap | null;
  useLineNumbers: boolean;
  className?: string;
  sigla: string[];
  /** Needed by the quick add form; defaults to the order of the sigla */
  witnessOrder?: number[];
  siglaGroups?: SiglaGroup[];
  lang?: string;
  /** If true (and onQuickEdit is given) the quick editing controls are available */
  canEdit?: boolean;
  onQuickEdit?: (entryIndex: number, operation: QuickEntryOperation) => Promise<QuickEditOutcome>;
  onHoverRange: (range: MainTextTokenRange | null) => void;
  hoveredEntryIndices?: number[];
  selectedLemmaIndex: number | null;
  editingEntryIndex?: number | null;
  onSelectLemma: (lemma: SelectedApparatusLemma | null) => void;
  onEditLemma?: (entryIndex: number) => void;
}

const NO_SIGLA_GROUPS: SiglaGroup[] = [];

interface EntryRange {
  from: number;
  to: number;
  entries: Array<{entry: ApparatusEntry, entryIndex: number}>;
}

export interface SelectedApparatusLemma {
  entryIndex: number;
  range: MainTextTokenRange;
}

export function ApparatusViewer({apparatus, lineNumberMap, useLineNumbers, className, sigla, witnessOrder,
                                 siglaGroups = NO_SIGLA_GROUPS, lang = '', canEdit = false, onQuickEdit,
                                 onHoverRange, selectedLemmaIndex, editingEntryIndex = null,
                                 hoveredEntryIndices = [], onSelectLemma,
                                 onEditLemma}: ApparatusViewerProps) {
  // the callbacks are kept in a ref so that the entry views receive stable functions and can be memoized
  const callbacks = useRef({onHoverRange, onSelectLemma, onEditLemma, onQuickEdit, editingEntryIndex, selectedLemmaIndex});
  callbacks.current = {onHoverRange, onSelectLemma, onEditLemma, onQuickEdit, editingEntryIndex, selectedLemmaIndex};
  const stableHoverRange = useCallback((range: MainTextTokenRange | null) => callbacks.current.onHoverRange(range), []);
  const stableClickLemma = useCallback((entryIndex: number, entry: ApparatusEntry) => {
    if (callbacks.current.editingEntryIndex === null) {
      callbacks.current.onSelectLemma(callbacks.current.selectedLemmaIndex === entryIndex ? null : {
        entryIndex,
        range: {from: entry.from, to: entry.to}
      });
    }
  }, []);
  const stableEditLemma = useCallback((entryIndex: number) => callbacks.current.onEditLemma?.(entryIndex), []);
  const stableQuickEdit = useCallback((entryIndex: number, operation: QuickEntryOperation) => {
    return callbacks.current.onQuickEdit!(entryIndex, operation);
  }, []);

  const entryRanges = useMemo(() => {
    const ranges: EntryRange[] = [];
    const usingLineNumbers = lineNumberMap !== null && useLineNumbers;
    const rangeIndices = new Map<string, number>();
    apparatus.entries.forEach((entry, entryIndex) => {
      const entryFrom = (usingLineNumbers ? lineNumberMap!.get(entry.from) : entry.from) ?? entry.from;
      const entryTo = (usingLineNumbers ? lineNumberMap!.get(entry.to) : entry.to) ?? entry.to;
      const rangeKey = `${entryFrom}-${entryTo}`;
      const rangeIndex = rangeIndices.get(rangeKey);
      if (rangeIndex === undefined) {
        rangeIndices.set(rangeKey, ranges.length);
        ranges.push({from: entryFrom, to: entryTo, entries: [{entry, entryIndex}]});
      } else {
        ranges[rangeIndex].entries.push({entry, entryIndex});
      }
    });
    return ranges;
  }, [apparatus, lineNumberMap, useLineNumbers]);

  const effectiveWitnessOrder = useMemo(() => witnessOrder ?? sigla.map((_s, index) => index), [witnessOrder, sigla]);

  const getRangeText = (range: EntryRange) => {
    if (range.from === range.to) {
      return `${range.from}`;
    }
    return `${range.from}-${range.to}`;
  };

  const canQuickEdit = canEdit && editingEntryIndex === null && onQuickEdit !== undefined;
  const selectedIndex = editingEntryIndex ?? selectedLemmaIndex;

  return <div className={className} onClick={(event) => {
    if (editingEntryIndex === null && (!(event.target instanceof Element) || !event.target.closest('.lemma'))) {
      onSelectLemma(null);
    }
  }}>
    {
      entryRanges.map((range, index) => {
        const rangeTextClasses = ['range-text', useLineNumbers ? 'line-number-range' : 'cti-range'];
        if (index === 0) {
          rangeTextClasses.push('first');
        }
        return <Fragment key={`${range.from}-${range.to}`}>
          <span className={rangeTextClasses.join(' ')}>{getRangeText(range)}</span>
          {range.entries.map(({entry, entryIndex}, indexInRange) => <ApparatusEntryView
            key={`${entry.from}-${entry.to}-${indexInRange}`}
            entry={entry} entryIndex={entryIndex} isFirstInRange={indexInRange === 0}
            isSelected={entryIndex === selectedIndex}
            isHovered={editingEntryIndex === null && hoveredEntryIndices.includes(entryIndex)}
            sigla={sigla} witnessOrder={effectiveWitnessOrder} siglaGroups={siglaGroups} lang={lang}
            canQuickEdit={canQuickEdit && entryIndex === selectedIndex}
            onHoverRange={stableHoverRange} onClickLemma={stableClickLemma}
            onEditLemma={stableEditLemma}
            onQuickEdit={onQuickEdit === undefined ? undefined : stableQuickEdit}/>)}
        </Fragment>;
      })
    }
  </div>;
}
