import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {CtDataInterface} from "@/CtData/CtDataInterface";


interface MainTextPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
}

export default function MainTextPanel({ ctData }: MainTextPanelProps) {
  return(<div className="main-text-panel">
    Main text panel will be displayed here
  </div>)
}