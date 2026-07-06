import {Children, isValidElement, ReactElement, useState} from "react";

import './panel-ui.css';
import {ArrowsAngleExpand} from "react-bootstrap-icons";
import {CloseButton} from "react-bootstrap";


export interface TabbableElementProps {
  /**
   * The key of the tab. If not provided, the index of the tab will be used.
   */
  tabKey?: string;
  /**
   * The title of the tab. If not provided, the tab key will be used.
   */
  tabTitle?: string;

  expandable?: boolean;
  closable?: boolean;
}

/**
 * A TabbableElement is a ReactElement that can be used as a tab in a TabPanel.
 *
 * It can be any ReactElement that can accept TabbableElementProps.
 *
 * These props are metadata that describes the tab so that the TabPanel can display the tab correctly.
 * The element may or may not use these props to alter its appearance or behavior.
 *
 * @see TabbableElementProps
 */
export type TabbableElement = ReactElement<TabbableElementProps>;

interface TabPanelChildSpec extends Required<TabbableElementProps> {
  element: TabbableElement;
}

interface TabPanelProps {
  /**
   * The key of the active tab. If not provided or null, the first tab will be active.
   */
  activeTabKey?: string | null;
  onClickTab?: (tabKey: string) => void;
  onClickExpand?: (tabKey: string) => void;
  onClickClose?: (tabKey: string) => void;
  children: TabbableElement | TabbableElement[];
  shimWidth?: number;
}

/**
 * A tab panel component that displays a set of tabs and their corresponding content.
 *
 * Each child element must be a valid TabbableElement, which is any element that accepts
 * TabbableElementProps, a set of metadata that describes the tab so that the TabPanel can display the tab
 * correctly.
 *
 * @param props
 * @constructor
 * @see TabbableElement
 * @see TabbableElementProps
 */
export default function TabPanel(props: TabPanelProps) {
  const children = Children.toArray(props.children) as TabbableElement[];
  const activeTabKey = props.activeTabKey ?? children[0].props.tabKey ?? `tab-0`;
  const shimWidth = props.shimWidth ?? 3;
  const [hoveredTabKey, setHoveredTabKey] = useState<string | null>(null);

  const childrenSpecs: TabPanelChildSpec[] = children.map((child, index) => {
    if (!isValidElement(child)) {
      throw new Error(`TabPanel children must be valid React elements, child ${index} is not`);
    }

    return {
      tabKey: child.props.tabKey ?? `tab-${index}`,
      tabTitle: child.props.tabTitle ?? `Tab ${index + 1}`,
      element: child,
      expandable: child.props.expandable ?? false,
      closable: child.props.closable ?? false,
    };
  });

  return <div className="tab-panel">
    <div className={'tab-panel-tabs'}>
      {shimWidth !== 0 && <div className={'shim'} style={{width: shimWidth + 'px'}}></div>}
      {childrenSpecs.map((spec) => {
        const isActive = spec.tabKey === activeTabKey;
        return <div
          key={spec.tabKey}
          className={'tab-panel-tab' + (isActive ? ' active' : '')}
          onMouseEnter={() => setHoveredTabKey(spec.tabKey)}
          onMouseLeave={() => setHoveredTabKey((current) => current === spec.tabKey ? null : current)}
        >
          <span className={'tab-title'} onClick={() => {
            props.onClickTab?.(spec.tabKey);
          }}>
            {spec.tabTitle}
          </span>
          {spec.expandable && isActive && hoveredTabKey === spec.tabKey &&
            <ArrowsAngleExpand className={'tab-button'} onClick={() => props.onClickExpand?.(spec.tabKey)} title={'Click to expand this tab'}/>}
          {spec.closable && isActive && hoveredTabKey === spec.tabKey &&
            <CloseButton className={'tab-button'} onClick={() => props.onClickClose?.(spec.tabKey)} title={'Click to close this tab'}/>}
        </div>;
      })}
    </div>
    <div className={'tab-panel-content'}>
      {childrenSpecs.map((spec) => {
        return <div key={spec.tabKey}
                    className={'tab-panel-content-item' + (spec.tabKey === activeTabKey ? ' active' : '')}>
          {spec.element}
        </div>;
      })}
    </div>
  </div>;
}