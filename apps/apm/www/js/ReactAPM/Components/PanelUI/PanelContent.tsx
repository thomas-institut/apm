import {CSSProperties, ReactNode} from "react";
import './PanelUI.css';

interface PanelContentProps {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * A wrapper component for panel content.
 *
 * It is normally used as a child of TabPanel
 * @param props
 * @constructor
 * @see TabPanel
 */
export default function PanelContent(props: PanelContentProps) {
  return <div className={'panel-content ' + (props.className ?? '')} style={ props.style ?? {}}>{props.children}</div>;
}