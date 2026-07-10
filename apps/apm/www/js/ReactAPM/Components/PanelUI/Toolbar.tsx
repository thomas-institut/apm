import {ReactNode} from "react";
import './PanelUI.css';

interface ToolbarProps {
  className?: string;
  children?: ReactNode;
}

export default function Toolbar(props: ToolbarProps) {
  return <div className={'panel-toolbar ' + (props.className ?? '')}>
    {props.children}
  </div>;
}