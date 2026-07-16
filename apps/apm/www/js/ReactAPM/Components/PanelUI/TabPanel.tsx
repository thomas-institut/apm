import {Children, cloneElement, isValidElement, ReactElement, ReactNode, useState} from "react";
import {ArrowsAngleExpand} from "react-bootstrap-icons";
import {CloseButton} from "react-bootstrap";
import './PanelUI.css';

/**
 * Props used to describe the component as a tab in a TabPanel.
 */
export interface TabbableElementSpecProps {
  /**
   * The key of the tab. If not provided, the tab's position in the tab array will be used.
   */
  tabKey?: string;
  /**
   * The title of the tab. If not provided, the tab key will be used.
   */
  tabTitle?: string;

  /**
   * Whether the tab is expandable.
   */
  expandable?: boolean;
  /**
   * Whether the tab is closable.
   */
  closable?: boolean;
}

/**
 * Props that will be injected by the TabPanel if the component is used in a TabPanel.
 *
 * The TabPanel will override any explicit values provided.
 */
export interface TabbableElementRunTimeProps {
  active?: boolean;
}

export interface TabbableElementProps extends TabbableElementSpecProps, TabbableElementRunTimeProps {
}

/**
 * A TabbableElement is a ReactElement that can be used as a tab in a TabPanel.
 *
 * It can be any ReactElement that can accept TabbableElementProps, which include props that describe the tab
 * within the TabPanel and props that will be injected by the TabPanel to reflect the state of the tab.
 *
 * @see TabbableElementProps
 */
export type TabbableElement = ReactElement<TabbableElementProps>;

interface TabPanelChildSpec extends Required<TabbableElementSpecProps> {
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

  const childrenSpecs = children.map((child, index): Required<TabPanelChildSpec> => {
    if (!isValidElement(child)) {
      throw new Error(`TabPanel children must be valid React elements, child ${index} is not`);
    }
    return {
      tabKey: child.props.tabKey ?? `tab-${index}`,
      tabTitle: child.props.tabTitle ?? `Tab ${index + 1}`,
      expandable: child.props.expandable ?? false,
      closable: child.props.closable ?? false,
      element: child,
    };
  });

  const injectRunTimeProps = (element: ReactNode, runTimeProps: TabbableElementRunTimeProps) => {
    if (!isValidElement(element)) {
      return element;
    }
    return cloneElement(element, {
      ...runTimeProps
    });
  };

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
            <ArrowsAngleExpand className={'tab-button'} onClick={() => props.onClickExpand?.(spec.tabKey)}
                               title={'Click to expand this tab'}/>}
          {spec.closable && isActive && hoveredTabKey === spec.tabKey &&
            <CloseButton className={'tab-button'} onClick={() => props.onClickClose?.(spec.tabKey)}
                         title={'Click to close this tab'}/>}
        </div>;
      })}
    </div>
    <div className={'tab-panel-content'}>
      {childrenSpecs.map((spec) => {
        const active = spec.tabKey === activeTabKey;
        return <div key={spec.tabKey}
                    className={'tab-panel-content-item' + (active ? ' active' : '')}>
          {injectRunTimeProps(spec.element, {active})}
        </div>;
      })}
    </div>
  </div>;
}