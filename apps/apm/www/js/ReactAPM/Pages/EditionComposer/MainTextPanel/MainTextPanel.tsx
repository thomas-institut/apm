import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";

import {MainTextToken} from "@/Edition/MainTextToken";
import MainTextViewer, {
  MainTextIndexToLineMap,
  MainTextTokenRange
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {CtDataInterface} from "@/CtData/CtDataInterface";
import './MainTextPanel.css';
import {
  getEditionWitnessIndexToCtIndexMap
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionWitnessIndexToCtIndexMap";
import {useMemo, useRef, useState} from "react";
import {Apparatus} from "@/Edition/Apparatus";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import MainTextPanelToolbar, {
  ApparatusHighlightSelection,
  MainTextEditMode
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanelToolbar";
import {
  MainTextApparatusEntryReference
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextApparatusPopover";


interface MainTextPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
  mainText: MainTextToken[];
  apparatuses: Apparatus[];
  activeApparatusIndex: number | null;
  sigla: string[];
  canEdit: boolean;
  highlightedTokenRange: MainTextTokenRange | null;
  selectedTokenRange?: MainTextTokenRange | null;
  onHoverApparatusEntries?: (entries: MainTextApparatusEntryReference[] | null) => void;
  onLineNumberingChange?: (lineNumbering: MainTextIndexToLineMap) => void | Promise<void>;
}

export default function MainTextPanel({mainText, ctData, apparatuses, activeApparatusIndex, sigla, canEdit, highlightedTokenRange,
                                       selectedTokenRange = null, onHoverApparatusEntries,
                                       onLineNumberingChange, active}: MainTextPanelProps) {

  const previousLineNumbering = useRef<MainTextIndexToLineMap | null>(null);
  const [mode, setMode] = useState<MainTextEditMode>('off');
  const [apparatusHighlightSelection, setApparatusHighlightSelection] = useState<ApparatusHighlightSelection>('active');
  const [showApparatusPopovers, setShowApparatusPopovers] = useState(true);
  const [apparatusSelection, setApparatusSelection] = useState<MainTextTokenRange | null>(null);
  const indexMap = useMemo(() => {
    return getEditionWitnessIndexToCtIndexMap(ctData, mainText.map(token => token.editionWitnessTokenIndex));
  }, [ctData, mainText]);


  const callOnLineNumberingChange = (lineNumbering: MainTextIndexToLineMap) => {
    if (!onLineNumberingChange) {
      return;
    }

    if (previousLineNumbering.current === null || active) {
      previousLineNumbering.current = lineNumbering;
      onLineNumberingChange(lineNumbering);
    }
  }

  const changeMode = (newMode: MainTextEditMode) => {
    if (newMode !== mode) {
      setApparatusSelection(null);
      setMode(newMode);
    }
  };

  return <Panel className={'main-text-panel'}>
      <MainTextPanelToolbar mode={mode} canEdit={canEdit}
                            apparatuses={apparatuses}
                            apparatusHighlightSelection={apparatusHighlightSelection}
                            showApparatusPopovers={showApparatusPopovers}
                            onModeChange={changeMode}
                            onChangeApparatusHighlightSelection={setApparatusHighlightSelection}
                            onChangeApparatusPopovers={setShowApparatusPopovers}/>

     <PanelContent>
       <MainTextViewer mainText={mainText} indexMap={indexMap} onLineNumberingChange={callOnLineNumberingChange}
                       highlightedTokenRange={highlightedTokenRange}
                       selectedTokenRange={apparatusSelection ?? selectedTokenRange}
                       mode={mode} canSelectTokens={canEdit}
                       apparatuses={apparatuses} activeApparatusIndex={activeApparatusIndex} sigla={sigla}
                       apparatusHighlightSelection={apparatusHighlightSelection}
                       showApparatusPopovers={showApparatusPopovers}
                       onHoverApparatusEntries={onHoverApparatusEntries}
                       onSelectionChange={setApparatusSelection}
                       className={['main-text-viewer', `text-${ctData.lang}`, `mode-${mode}`].join(' ')}/>
     </PanelContent>

  </Panel>;
}