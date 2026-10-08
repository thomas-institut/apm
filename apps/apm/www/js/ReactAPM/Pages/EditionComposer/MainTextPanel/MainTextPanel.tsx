import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";

import {MainTextToken} from "@/Edition/MainTextToken";
import MainTextViewer, {MainTextIndexToLineMap} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {CtDataInterface} from "@/CtData/CtDataInterface";
import './MainTextPanel.css';
import {
  getEditionWitnessIndexToCtIndexMap
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionWitnessIndexToCtIndexMap";
import {useMemo} from "react";


interface MainTextPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
  mainText: MainTextToken[];
  onLineNumberingChange?: (lineNumbering: MainTextIndexToLineMap) => void | Promise<void>
}

export default function MainTextPanel({mainText, ctData, onLineNumberingChange}: MainTextPanelProps) {

  const indexMap = useMemo(() => {
    return getEditionWitnessIndexToCtIndexMap(ctData, mainText.map(token => token.editionWitnessTokenIndex));
  }, [ctData, mainText]);

  return (<div className={"main-text-panel"}>
    <MainTextViewer mainText={mainText} indexMap={indexMap} onLineNumberingChange={onLineNumberingChange}
                    className={['main-text-viewer', `text-${ctData.lang}`].join(' ')}/>
  </div>);
}