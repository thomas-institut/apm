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
import {useEffect, useMemo, useRef, useState} from "react";
import {Apparatus} from "@/Edition/Apparatus";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import MainTextPanelToolbar, {
  ApparatusHighlightSelection,
  ApparatusTargetSelection,
  MainTextEditMode
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanelToolbar";
import {
  MainTextApparatusEntryReference
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextApparatusPopover";
import MainTextQuickAddOverlay from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextQuickAddOverlay";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import {
  QuickApparatusEdit,
  QuickEditOutcome,
  QuickSubEntryData,
  findEntryIndexForCtRange
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";
import {getCtRangeForMainTextRange} from "@/Edition/ApparatusEntryCustomization";


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
  siglaGroups?: SiglaGroup[];
  /** Called for the quick add of a sub-entry from a main text selection */
  onQuickEdit?: (edit: QuickApparatusEdit) => Promise<QuickEditOutcome>;
  /** Called to open the full entry editor of an apparatus for a main text range (the vanilla flow) */
  onEditApparatusEntry?: (apparatusIndex: number, range: MainTextTokenRange) => void;
  onLineNumberingChange?: (lineNumbering: MainTextIndexToLineMap) => void | Promise<void>;
}

const NO_SIGLA_GROUPS: SiglaGroup[] = [];
const NO_WITNESS_ORDER: number[] = [];

export default function MainTextPanel({mainText, ctData, apparatuses, activeApparatusIndex, sigla, canEdit, highlightedTokenRange,
                                       selectedTokenRange = null, onHoverApparatusEntries, siglaGroups = NO_SIGLA_GROUPS,
                                       onQuickEdit, onEditApparatusEntry,
                                       onLineNumberingChange, active}: MainTextPanelProps) {

  const previousLineNumbering = useRef<MainTextIndexToLineMap | null>(null);
  const [mode, setMode] = useState<MainTextEditMode>('view');
  const [apparatusHighlightSelection, setApparatusHighlightSelection] = useState<ApparatusHighlightSelection>('active');
  const [showApparatusPopovers, setShowApparatusPopovers] = useState(true);
  const [apparatusSelection, setApparatusSelection] = useState<MainTextTokenRange | null>(null);
  const [apparatusTargetSelection, setApparatusTargetSelection] = useState<ApparatusTargetSelection>('active');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const lineNumberingRef = useRef<MainTextIndexToLineMap | null>(null);
  const indexMap = useMemo(() => {
    return getEditionWitnessIndexToCtIndexMap(ctData, mainText.map(token => token.editionWitnessTokenIndex));
  }, [ctData, mainText]);


  const callOnLineNumberingChange = (lineNumbering: MainTextIndexToLineMap) => {
    lineNumberingRef.current = lineNumbering;
    if (!onLineNumberingChange) {
      return;
    }

    if (previousLineNumbering.current === null || active) {
      previousLineNumbering.current = lineNumbering;
      onLineNumberingChange(lineNumbering);
    }
  }

  const targetApparatusIndex = apparatusTargetSelection === 'active' ? activeApparatusIndex : apparatusTargetSelection;
  const targetApparatus = targetApparatusIndex === null ? undefined : apparatuses[targetApparatusIndex];
  const canQuickAdd = canEdit && onQuickEdit !== undefined && mode === 'apparatus' && apparatusSelection !== null;

  // the quick add overlay is anchored to the last selected token
  useEffect(() => {
    if (!canQuickAdd || apparatusSelection === null) {
      setAnchor(null);
      return;
    }
    const last = Math.max(apparatusSelection.from, apparatusSelection.to);
    setAnchor(contentRef.current?.querySelector<HTMLElement>(`.mtt-${last}`) ?? null);
  }, [canQuickAdd, apparatusSelection, mainText]);

  const selectionInfo = useMemo(() => {
    if (apparatusSelection === null) {
      return null;
    }
    const first = Math.min(apparatusSelection.from, apparatusSelection.to);
    const last = Math.max(apparatusSelection.from, apparatusSelection.to);
    const lemmaText = mainText.slice(first, last + 1).filter((token) => token.type === 'text')
      .map((token) => token.getPlainText()).join(' ');
    let targetEntry = null;
    if (targetApparatus !== undefined) {
      try {
        const ctRange = getCtRangeForMainTextRange(ctData, mainText, apparatusSelection);
        const entryIndex = findEntryIndexForCtRange(ctData, mainText, targetApparatus, ctRange);
        targetEntry = entryIndex === -1 ? null : targetApparatus.entries[entryIndex];
      } catch (e) {
        targetEntry = null;
      }
    }
    return {first, last, lemmaText, targetEntry};
  }, [apparatusSelection, targetApparatus, ctData, mainText]);

  const clearSelection = () => {
    setApparatusSelection(null);
    setClearSelectionSignal((signal) => signal + 1);
  };

  const quickAdd = async (data: QuickSubEntryData): Promise<QuickEditOutcome> => {
    if (onQuickEdit === undefined || targetApparatus === undefined || apparatusSelection === null) {
      return 'No target apparatus';
    }
    const outcome = await onQuickEdit({
      kind: 'addSubEntryToRange', apparatusType: targetApparatus.type,
      mainTextRange: {from: selectionInfo!.first, to: selectionInfo!.last}, subEntry: data
    });
    if (outcome === true) {
      clearSelection();
    }
    return outcome;
  };

  const enableExisting = async (subEntryIndex: number): Promise<QuickEditOutcome> => {
    if (onQuickEdit === undefined || targetApparatusIndex === null || selectionInfo === null) {
      return 'No target apparatus';
    }
    const entryIndex = targetApparatus?.entries.indexOf(selectionInfo.targetEntry!) ?? -1;
    if (entryIndex === -1) {
      return 'The apparatus entry does not exist anymore';
    }
    const outcome = await onQuickEdit({
      kind: 'toggleSubEntry', apparatusIndex: targetApparatusIndex, entryIndex, subEntryIndex
    });
    if (outcome === true) {
      clearSelection();
    }
    return outcome;
  };

  const changeMode = (newMode: MainTextEditMode) => {
    if (newMode !== mode) {
      setApparatusSelection(null);
      if (newMode !== 'view') {
        onHoverApparatusEntries?.(null);
      }
      setMode(newMode);
    }
  };

  return <Panel className={'main-text-panel'}>
      <MainTextPanelToolbar mode={mode} canEdit={canEdit}
                            apparatuses={apparatuses}
                            apparatusHighlightSelection={apparatusHighlightSelection}
                            showApparatusPopovers={showApparatusPopovers}
                            onModeChange={changeMode}
                            apparatusTargetSelection={apparatusTargetSelection}
                            onChangeApparatusTargetSelection={onQuickEdit === undefined && onEditApparatusEntry === undefined ?
                              undefined : setApparatusTargetSelection}
                            onChangeApparatusHighlightSelection={setApparatusHighlightSelection}
                            onChangeApparatusPopovers={setShowApparatusPopovers}/>

     <PanelContent>
       <div ref={contentRef} style={{display: 'contents'}}>
       <MainTextViewer mainText={mainText} indexMap={indexMap} onLineNumberingChange={callOnLineNumberingChange}
                       highlightedTokenRange={mode === 'view' ? highlightedTokenRange : null}
                       selectedTokenRange={apparatusSelection ?? selectedTokenRange}
                       mode={mode} canSelectTokens={canEdit} clearSelectionSignal={clearSelectionSignal}
                       apparatuses={apparatuses} activeApparatusIndex={activeApparatusIndex} sigla={sigla}
                       siglaGroups={siglaGroups} lang={ctData.lang}
                       apparatusHighlightSelection={mode === 'view' ? apparatusHighlightSelection : 'none'}
                       showApparatusPopovers={mode === 'view' && showApparatusPopovers}
                       onHoverApparatusEntries={mode === 'view' ? onHoverApparatusEntries : undefined}
                       onSelectionChange={setApparatusSelection}
                       className={['main-text-viewer', `text-${ctData.lang}`, `mode-${mode}`].join(' ')}/>
       </div>
       {canQuickAdd && selectionInfo !== null && <MainTextQuickAddOverlay
         key={`${selectionInfo.first}-${selectionInfo.last}-${targetApparatus?.type ?? ''}`}
         anchor={anchor} targetApparatusType={targetApparatus?.type ?? null}
         lemmaText={selectionInfo.lemmaText}
         lineNumber={lineNumberingRef.current?.get(selectionInfo.first)}
         sigla={sigla} witnessOrder={ctData.witnessOrder ?? NO_WITNESS_ORDER} siglaGroups={siglaGroups} lang={ctData.lang}
         targetEntry={selectionInfo.targetEntry}
         onQuickAdd={quickAdd} onEnableExisting={enableExisting}
         onEditEntry={onEditApparatusEntry === undefined || targetApparatusIndex === null ? undefined : () => {
           onEditApparatusEntry(targetApparatusIndex, {from: selectionInfo.first, to: selectionInfo.last});
           clearSelection();
         }}/>}
     </PanelContent>

  </Panel>;
}