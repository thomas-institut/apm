import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {CtDataInterface} from "@/CtData/CtDataInterface";


interface CtPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
}

export default function CtPanel( { ctData }: CtPanelProps) {
  return(<div className="ct-panel">
    Collation table will be displayed here
  </div>)
}