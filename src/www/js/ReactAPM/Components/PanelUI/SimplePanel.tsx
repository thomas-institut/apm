import {ReactNode} from "react";
import './panel-ui.css'
interface SimplePanelProps {
  tabKey?: string;
  tabTitle?: string;
  children?: ReactNode;
}

export default function SimplePanel(props: SimplePanelProps) {
  return <div className='simple-panel panel-content'>{props.children}</div>;
}