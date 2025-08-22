import React, {CSSProperties, ReactNode} from "react";


interface PanelWithToolbarProps {
  toolBar: ReactNode;
  toolBarClass?: string;
  panelClass?: string;
  containerClass?: string;
  children?: ReactNode;
}

export default function PanelWithToolbar(props: PanelWithToolbarProps) {

  const toolBarClass = props.toolBarClass ?? "";
  const panelClass = props.panelClass ?? "";
  const containerClass = props.containerClass ?? "";

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  }

  const toolBarStyle: CSSProperties = {
    flexGrow: 0,
  }
  const panelStyle: CSSProperties = {
    flexGrow: 1,
    overflowX: "auto",
    overflowY: "auto",
  }

  return (<div style={containerStyle} className={containerClass}>
    <div style={toolBarStyle} className={toolBarClass}>
      {props.toolBar}
    </div>
    <div style={panelStyle} className={panelClass}>
      {props.children}
    </div>

  </div>)



}