import {Apparatus} from "@/Edition/Apparatus";
import {
  MainTextIndexToLineMap,
  MainTextTokenRange
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {Fragment} from "react";
import SubEntry from "@/ReactAPM/Pages/EditionComposer/SubEntry";


interface ApparatusViewerProps {
  apparatus: Apparatus;
  lineNumberMap: MainTextIndexToLineMap | null;
  useLineNumbers: boolean;
  className?: string;
  sigla: string[];
  onHoverRange: (range: MainTextTokenRange | null) => void;
  hoveredEntryIndices?: number[];
  selectedLemmaIndex: number | null;
  onSelectLemma: (lemma: SelectedApparatusLemma | null) => void;
  onEditLemma?: (entryIndex: number) => void;
}

interface EntryRange {
  from: number;
  to: number;
  entries: ApparatusEntry[];
}

export interface SelectedApparatusLemma {
  entryIndex: number;
  range: MainTextTokenRange;
}

export function ApparatusViewer({apparatus, lineNumberMap, useLineNumbers, className, sigla,
                                 onHoverRange, selectedLemmaIndex, hoveredEntryIndices = [], onSelectLemma,
                                 onEditLemma}: ApparatusViewerProps) {
  const getEntryRanges = (apparatus: Apparatus, lineNumberMap: MainTextIndexToLineMap | null, useLineNumbers: boolean) => {
    const ranges: EntryRange[] = [];
    const usingLineNumbers = lineNumberMap !== null && useLineNumbers;
    apparatus.entries.forEach((entry) => {
      const entryFrom = (usingLineNumbers ? lineNumberMap!.get(entry.from) : entry.from) ?? entry.from;
      const entryTo = (usingLineNumbers ? lineNumberMap!.get(entry.to) : entry.to) ?? entry.to;
      const rangeIndex = ranges.findIndex((range) => range.from === entryFrom && range.to === entryTo);
      if (rangeIndex === -1) {
        ranges.push({
          from: entryFrom,
          to: entryTo,
          entries: [entry]
        });
      } else {
        ranges[rangeIndex].entries.push(entry);
      }
    });
    return ranges;
  };

  const getRangeText = (range: EntryRange) => {
    if (range.from === range.to) {
      return `${range.from}`;
    }
    return `${range.from}-${range.to}`;
  };

  const entryRanges = getEntryRanges(apparatus, lineNumberMap, useLineNumbers);

  return <div className={className} onClick={(event) => {
    if (!(event.target instanceof Element) || !event.target.closest('.lemma')) {
      onSelectLemma(null);
    }
  }}>
    {
      entryRanges.map((range, index) => {
        const rangeTextClasses = ['range-text', useLineNumbers ? 'line-number-range' : 'cti-range'];
        if (index === 0) {
          rangeTextClasses.push('first');
        }
        return <Fragment key={index}>
          <span className={rangeTextClasses.join(' ')}>{getRangeText(range)}</span>
          {range.entries.map((entry, index) => {
            const lemmaText = entry.mainTextWords.join(' ');
            const entryIndex = apparatus.entries.indexOf(entry);
            const lemmaClasses = ['lemma'];
            if (index === 0) {
              lemmaClasses.push('first');
            }
            if (entryIndex === selectedLemmaIndex) {
              lemmaClasses.push('selected');
            }
            if (hoveredEntryIndices.includes(entryIndex)) {
              lemmaClasses.push('main-text-hover');
            }
            return <Fragment key={index}><span key="lemma"
                                               className={lemmaClasses.join(' ')}
                                               onClick={() => onSelectLemma({
                                                 entryIndex,
                                                 range: {from: entry.from, to: entry.to}
                                               })}
                                               onDoubleClick={() => onEditLemma?.(entryIndex)}
                                               onMouseEnter={() => onHoverRange({from: entry.from, to: entry.to})}
                                               onMouseLeave={() => onHoverRange(null)}>{lemmaText + ']'}</span><span
              key="subentries">{
              entry.subEntries.map((subEntry, index) => <SubEntry key={index} subEntry={subEntry} isFirst={index === 0}
                                                                  sigla={sigla}/>)
            }</span></Fragment>;
          })}

        </Fragment>;
      })
    }
  </div>;
}