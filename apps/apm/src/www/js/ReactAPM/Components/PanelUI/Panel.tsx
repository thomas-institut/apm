import {Children, CSSProperties, isValidElement, ReactElement, ReactNode} from "react";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";


interface PanelProps {
  tabKey?: string;
  tabTitle?: string;
  // className to apply to the panel content
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * A panel that can be used to display information.
 *
 * The panel can be used as a tab in a TabPanel or on its own with a parent
 * that set its height.
 *
 * If the first child is a Toolbar, only another child is allowed. The Toolbar will be displayed
 * at the top and the second child will be displayed below it as panel content. Use PanelContent to avoid
 * having to wrap the content in a div.
 *
 * Otherwise, all children will be displayed in a scrollable area.
 *
 * @constructor
 */
export default function Panel(props: PanelProps) {
  const children = Children.toArray(props.children);

  if (children.length > 1 && isValidElement(children[0]) && (children[0] as ReactElement).type === Toolbar) {
    if (children.length > 2) {
      throw new Error('Panel can only have two children if the first one is a Toolbar');
    }
    if (isValidElement(children[1]) && (children[1] as ReactElement).type === PanelContent) {
      return (<div className={'panel-with-toolbar ' + (props.className ?? '')}>
        {children[0]}
        {children[1]}
      </div>);
    }
    return (<div className={'panel-with-toolbar'}>
      {children[0]}
      <PanelContent className={props.className}>{children[1]}</PanelContent>
    </div>);
  }

  return <PanelContent className={ 'panel ' + (props.className ?? '')} style={ props.style ?? {}}>{children}</PanelContent>;
}

