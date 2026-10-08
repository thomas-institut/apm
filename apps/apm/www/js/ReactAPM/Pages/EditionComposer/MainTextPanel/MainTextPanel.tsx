import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";

import {MainTextToken} from "@/Edition/MainTextToken";
import MainTextViewer from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {CtDataInterface} from "@/CtData/CtDataInterface";
import './MainTextPanel.css';
import {
  getEditionWitnessIndexToCtIndexMap
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionWitnessIndexToCtIndexMap";
import {useMemo} from "react";


interface MainTextPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
  mainText: MainTextToken[];
}

export default function MainTextPanel({mainText, ctData}: MainTextPanelProps) {

  const indexMap = useMemo(() => {
    return getEditionWitnessIndexToCtIndexMap(ctData, mainText.map(token => token.editionWitnessTokenIndex));
  }, [ctData, mainText]);

  return (<div className={"main-text-panel"}>
    <MainTextViewer mainText={mainText} indexMap={indexMap}
                    className={['main-text-viewer', `text-${ctData.lang}`].join(' ')}/>
  </div>);
}