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
import {useState} from "react";
import SwitchToggle from "@/ReactAPM/Components/NiceToggle/SwitchToggle";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";


interface ApparatusPanelProps extends TabbableElementProps {
  apparatus: Apparatus;
  lineNumberMap: MainTextIndexToLineMap | null;
  lang: string;
  sigla: string[];
  onHoverRange: (range: MainTextTokenRange | null) => void;
  hoveredEntryIndices?: number[];
  selectedLemmaIndex: number | null;
  onSelectLemma: (lemma: SelectedApparatusLemma | null) => void;
}

export function ApparatusPanel({apparatus, lineNumberMap, sigla, lang, onHoverRange, selectedLemmaIndex,
                                onSelectLemma, hoveredEntryIndices = []}: ApparatusPanelProps) {
  const [ useLineNumbers, setUseLineNumbers] = useState(true);

  if (apparatus.entries.length === 0) {
    return <div className="apparatus-panel empty-apparatus">No apparatus entries</div>
  }

  const viewerClasses = [ 'apparatus-viewer', `text-${lang}`]

  return <Panel className="apparatus-panel">
    <Toolbar>
      <div/>
      <div/>
      <div/>
      <div className={'toolbar-group right'}>
        <span>Show line numbers: </span><SwitchToggle isOn={useLineNumbers} onClick={(state)=>setUseLineNumbers(state)} />
      </div>
    </Toolbar>
    <PanelContent>
      <ApparatusViewer className={viewerClasses.join(' ')} apparatus={apparatus} lineNumberMap={lineNumberMap}
                       useLineNumbers={useLineNumbers} sigla={sigla} onHoverRange={onHoverRange}
                       selectedLemmaIndex={selectedLemmaIndex} hoveredEntryIndices={hoveredEntryIndices}
                       onSelectLemma={onSelectLemma}/>
    </PanelContent>

  </Panel>;
}