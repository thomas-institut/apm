import {Apparatus} from "@/Edition/Apparatus";
import {MainTextIndexToLineMap} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {Fragment} from "react";
import {ApparatusSubEntry} from "@/Edition/ApparatusSubEntry";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";


interface ApparatusViewerProps {
  apparatus: Apparatus;
  lineNumberMap: MainTextIndexToLineMap | null;
  useLineNumbers: boolean;
  className?: string;
  sigla: string[];
}

interface EntryRange {
  from: number;
  to: number;
  entries: ApparatusEntry[];
}

export function ApparatusViewer({apparatus, lineNumberMap, useLineNumbers, className, sigla}: ApparatusViewerProps) {
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

  return <div className={className}>
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
            const lemmaClasses = ['lemma'];
            if (index === 0) {
              lemmaClasses.push('first');
            }
            return <Fragment key={index}><span key="lemma"
                                               className={lemmaClasses.join(' ')}>{lemmaText + ']'}</span><span
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

interface SubEntryProps {
  subEntry: ApparatusSubEntry;
  isFirst: boolean;
  sigla: string[];
}

function SubEntry({subEntry, isFirst, sigla}: SubEntryProps) {
  const keywords: Map<string, string> = new Map();
  keywords.set('empty', '');
  keywords.set('omission', 'om.');
  keywords.set('addition', 'add.');

  const subEntryClasses = ['sub-entry'];
  if (isFirst) {
    subEntryClasses.push('first');
  }
  if (!subEntry.enabled) {
    subEntryClasses.push('disabled');
  }
  const witnessDataText = subEntry.witnessData.map((wd) => sigla[wd.witnessIndex]).join('');
  return <span className={subEntryClasses.join(' ')}><i>{keywords.get(subEntry.type)}</i> <FmtTextRenderer
    t={subEntry.fmtText}/> {witnessDataText}</span>;
}