import React, {CSSProperties, ReactNode} from "react";


interface PanelWithToolbarProps {
  tabKey?: string;
  tabTitle?: string;
  toolbar: ReactNode;
  toolbarClassName?: string;
  contentClassName?: string;
  containerClassName?: string;
  children?: ReactNode;
  showToolBar?: boolean;
}

export default function PanelWithToolbar(props: PanelWithToolbarProps) {

  const toolBarClass = props.toolbarClassName ?? "";
  const panelClass = props.contentClassName ?? "";
  const containerClass = props.containerClassName ?? "";
  const showToolBar = props.showToolBar ?? true;

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  }

  const toolBarStyle: CSSProperties = {
    flexGrow: 0,
    display: 'flex',
  }
  const panelStyle: CSSProperties = {
    flexGrow: 1,
    overflowX: "auto",
    overflowY: "auto",
  }

  return (<div style={containerStyle} className={containerClass}>
    <div style={toolBarStyle} className={toolBarClass + ' panel-toolbar'}>
      {showToolBar && props.toolbar}
    </div>
    <div style={panelStyle} className={panelClass + ' panel-content'}>
      {props.children}
    </div>

  </div>)



}