import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Apparatus} from "@/Edition/Apparatus";


interface ApparatusPanelProps extends TabbableElementProps {
  apparatus: Apparatus;
}


export function ApparatusPanel({apparatus}: ApparatusPanelProps) {
  return (<div className="apparatus-panel">
    <h2>{apparatus.type}</h2>
  </div>)
}