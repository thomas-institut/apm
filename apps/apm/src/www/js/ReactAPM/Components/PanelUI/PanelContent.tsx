import {CSSProperties, ReactNode} from "react";

interface PanelContentProps {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export default function PanelContent(props: PanelContentProps) {
  return <div className={'panel-content ' + (props.className ?? '')} style={ props.style ?? {}}>{props.children}</div>;
}