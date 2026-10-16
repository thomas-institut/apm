import {fromCompactFmtText} from "@thomas-inst/fmt-text";
import {Apparatus} from "@/Edition/Apparatus";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";
import SubEntry from "@/ReactAPM/Pages/EditionComposer/SubEntry";
import {Popover} from "react-bootstrap";
import {OverlayInjectedProps} from "react-bootstrap/types";

export interface MainTextApparatusEntryReference {
  apparatusIndex: number;
  entryIndex: number;
}

interface MainTextApparatusPopoverProps extends Partial<OverlayInjectedProps> {
  apparatuses: Apparatus[];
  entryReferences: MainTextApparatusEntryReference[];
  sigla: string[];
  tokenIndex: number;
  tokenText: string;
  lineNumber?: number;
}

interface GroupedApparatusEntries {
  apparatus: Apparatus;
  entries: Array<{entry: ApparatusEntry, entryIndex: number}>;
}

const getGroupedEntries = (apparatuses: Apparatus[], references: MainTextApparatusEntryReference[]): GroupedApparatusEntries[] => {
  const groups = new Map<number, GroupedApparatusEntries>();
  references.forEach(({apparatusIndex, entryIndex}) => {
    const apparatus = apparatuses[apparatusIndex];
    const entry = apparatus?.entries[entryIndex];
    if (apparatus === undefined || entry === undefined) {
      return;
    }
    let group = groups.get(apparatusIndex);
    if (group === undefined) {
      group = {apparatus, entries: []};
      groups.set(apparatusIndex, group);
    }
    group.entries.push({entry, entryIndex});
  });
  return Array.from(groups.values());
};

const getLemma = (entry: ApparatusEntry): string =>
  entry.lemmaType === 'custom' ? entry.customLemmaText : entry.mainTextWords.join(' ');

export default function MainTextApparatusPopover({apparatuses, entryReferences, sigla, tokenIndex,
                                                  tokenText, lineNumber, ...overlayProps}: MainTextApparatusPopoverProps) {
  const groupedEntries = getGroupedEntries(apparatuses, entryReferences);

  return <Popover {...overlayProps} id={`main-text-apparatus-popover-${tokenIndex}`} className="main-text-apparatus-popover">
    <Popover.Header as="h3">{lineNumber === undefined ? '' : `Line ${lineNumber}: `}{tokenText}</Popover.Header>
    <Popover.Body>
      {groupedEntries.map(({apparatus, entries}, apparatusIndex) => <section key={`${apparatus.type}-${apparatusIndex}`}>
        <h4>{apparatus.type.charAt(0).toUpperCase() + apparatus.type.slice(1)}</h4>
        {entries.map(({entry, entryIndex}) => <div className="main-text-apparatus-entry" key={entryIndex}>
          <div className="main-text-apparatus-entry-lemma">
            <span className="main-text-apparatus-entry-range">{entry.from === entry.to ? entry.from : `${entry.from}–${entry.to}`}</span>
            {' '}{entry.preLemma !== '' && <><FmtTextRenderer t={fromCompactFmtText(entry.preLemma)}/>{' '}</>}
            [{getLemma(entry)}]
            {entry.postLemma !== '' && <>{' '}<FmtTextRenderer t={fromCompactFmtText(entry.postLemma)}/></>}
          </div>
          <ul>
            {entry.subEntries.map((subEntry, subEntryIndex) => <li key={subEntryIndex}>
              <SubEntry subEntry={subEntry} subEntryIndex={subEntryIndex} sigla={sigla}/>
            </li>)}
          </ul>
        </div>)}
      </section>)}
    </Popover.Body>
  </Popover>;
}