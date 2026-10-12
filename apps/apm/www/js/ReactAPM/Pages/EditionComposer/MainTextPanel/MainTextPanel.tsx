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
import {useMemo, useRef} from "react";


interface MainTextPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
  mainText: MainTextToken[];
  highlightedTokenRange: MainTextTokenRange | null;
  selectedTokenRange?: MainTextTokenRange | null;
  onLineNumberingChange?: (lineNumbering: MainTextIndexToLineMap) => void | Promise<void>;
}

export default function MainTextPanel({mainText, ctData, highlightedTokenRange, selectedTokenRange = null,
                                       onLineNumberingChange, active}: MainTextPanelProps) {

  const previousLineNumbering = useRef<MainTextIndexToLineMap | null>(null);
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

  return (<div className={"main-text-panel"}>
    <MainTextViewer mainText={mainText} indexMap={indexMap} onLineNumberingChange={callOnLineNumberingChange}
                    highlightedTokenRange={highlightedTokenRange}
                    selectedTokenRange={selectedTokenRange}
                    className={['main-text-viewer', `text-${ctData.lang}`].join(' ')}/>
  </div>);
}