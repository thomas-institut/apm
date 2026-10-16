import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Apparatus} from "@/Edition/Apparatus";
import {
  MainTextIndexToLineMap,
  MainTextTokenRange
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import './ApparatusPanel.css';
import {ApparatusViewer, SelectedApparatusLemma} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusViewer";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import {useEffect, useState} from "react";
import SwitchToggle from "@/ReactAPM/Components/NiceToggle/SwitchToggle";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import {CtDataInterface, CustomApparatusEntryInterface} from "@/CtData/CtDataInterface";
import {MainTextToken} from "@/Edition/MainTextToken";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {
  CtRange,
  customEntryFromApparatusEntry,
  getCtRangeForEntry
} from "@/Edition/ApparatusEntryCustomization";
import ApparatusEntryEditor
  from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/ApparatusEntryEditor";


interface ApparatusPanelProps extends TabbableElementProps {
  apparatus: Apparatus;
  lineNumberMap: MainTextIndexToLineMap | null;
  lang: string;
  sigla: string[];
  siglaGroups: SiglaGroup[];
  ctData: CtDataInterface;
  mainText: MainTextToken[];
  canEdit?: boolean;
  onHoverRange: (range: MainTextTokenRange | null) => void;
  hoveredEntryIndices?: number[];
  selectedLemmaIndex: number | null;
  onSelectLemma: (lemma: SelectedApparatusLemma | null) => void;
  /**
   * Called when the user commits changes in the entry editor.
   * Must return true if the change was applied.
   */
  onUpdateEntry?: (apparatusType: string, customEntry: CustomApparatusEntryInterface, lemmaText: string) => Promise<boolean>;
}

interface EditedEntryInfo {
  entryIndex: number;
  entry: ApparatusEntry;
  ctRange: CtRange;
}

export function ApparatusPanel({
                                 apparatus, lineNumberMap, sigla, siglaGroups, lang, ctData, mainText, canEdit = false,
                                 onHoverRange, selectedLemmaIndex, onSelectLemma, hoveredEntryIndices = [], onUpdateEntry
                               }: ApparatusPanelProps) {
  const [useLineNumbers, setUseLineNumbers] = useState(true);
  const [editedEntryInfo, setEditedEntryInfo] = useState<EditedEntryInfo | null>(null);

  // a new apparatus (after an update, undo, redo...) invalidates the entry in the editor
  useEffect(() => {
    setEditedEntryInfo(null);
  }, [apparatus]);

  if (apparatus.entries.length === 0) {
    return <div className="apparatus-panel empty-apparatus">No apparatus entries</div>;
  }

  const viewerClasses = ['apparatus-viewer', `text-${lang}`];

  const editEntry = (entryIndex: number) => {
    if (!canEdit || onUpdateEntry === undefined) {
      return;
    }
    const entry = apparatus.entries[entryIndex];
    if (entry === undefined) {
      return;
    }
    try {
      const ctRange = getCtRangeForEntry(ctData, mainText, entry);
      setEditedEntryInfo({entryIndex, entry: ApparatusEntry.clone(entry), ctRange});
    } catch (e) {
      console.warn(`Cannot edit apparatus entry ${entryIndex}`, e);
    }
  };

  const updateEntry = async (editedEntry: ApparatusEntry) => {
    if (editedEntryInfo === null || onUpdateEntry === undefined) {
      return;
    }
    const customEntry = customEntryFromApparatusEntry(editedEntry, editedEntryInfo.ctRange);
    const applied = await onUpdateEntry(apparatus.type, customEntry, editedEntry.mainTextWords.join(' '));
    if (applied) {
      setEditedEntryInfo(null);
    }
  };

  return <Panel className="apparatus-panel">
    <Toolbar>
      <div/>
      <div/>
      <div/>
      <div className={'toolbar-group right'}>
        <span>Show line numbers: </span><SwitchToggle isOn={useLineNumbers} onClick={(state) => setUseLineNumbers(state)}/>
      </div>
    </Toolbar>
    <PanelContent>
      <ApparatusViewer className={viewerClasses.join(' ')} apparatus={apparatus} lineNumberMap={lineNumberMap}
                       useLineNumbers={useLineNumbers} sigla={sigla} onHoverRange={onHoverRange}
                       selectedLemmaIndex={selectedLemmaIndex} hoveredEntryIndices={hoveredEntryIndices}
                       onSelectLemma={onSelectLemma} onEditLemma={editEntry}/>
      {editedEntryInfo !== null &&
        <ApparatusEntryEditor
          key={`${editedEntryInfo.entryIndex}-${editedEntryInfo.ctRange.from}-${editedEntryInfo.ctRange.to}`}
          entry={editedEntryInfo.entry}
          ctRange={editedEntryInfo.ctRange}
          lang={lang}
          sigla={sigla}
          siglaGroups={siglaGroups}
          onUpdate={updateEntry}
          onCancel={() => setEditedEntryInfo(null)}/>}
    </PanelContent>

  </Panel>;
}
