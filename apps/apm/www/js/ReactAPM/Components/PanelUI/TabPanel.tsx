
import {Children, CSSProperties, isValidElement, ReactElement} from "react";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";

import './panel-ui.css'


interface TabPanelChildProps {
  tabKey?: string;
  tabTitle?: string;
}


interface TabPanelChildSpec extends Required<TabPanelChildProps> {
  element: TabPanelChild;
}



type TabPanelChild = ReactElement<TabPanelChildProps, typeof Panel>;


const ValidTypes = [Panel];
interface TabPanelProps {
  activeTabKey?: string;
  onClickTab?: (tabKey: string) => void;
  children: TabPanelChild | TabPanelChild[];
  shimWidth?: number;
  style?: CSSProperties
}
export default function TabPanel(props: TabPanelProps) {

  const children = Children.toArray(props.children) as TabPanelChild[];
  const activeTabKey = props.activeTabKey ?? children[0].props.tabKey ?? `tab-0`;
  const shimWidth = props.shimWidth ?? 3;

  const childSpecs: TabPanelChildSpec[] = children.map((child, index) => {
    if (!isValidElement(child)) {
      throw new Error('TabPanel children must be valid React elements');
    }
    if (!ValidTypes.includes(child.type)) {
      throw new Error(`TabPanel children must be Panel, got ${child.type}`);
    }
    return {
      tabKey: child.props.tabKey ?? `tab-${index}`,
      tabTitle: child.props.tabTitle ?? `Tab ${index + 1}`,
      element: child,
    }
  });

  return <div className="tab-panel">
    <div className={'tab-panel-tabs'}>
      <div className={'shim'} style={{width: shimWidth + 'px'}}></div>
      { childSpecs.map((spec) => {
        return <div key={spec.tabKey} className={'tab-panel-tab' + (spec.tabKey === activeTabKey ? ' active' : '')} onClick={() => {props.onClickTab?.(spec.tabKey);}}>
          {spec.tabTitle}
        </div>
      })}
    </div>
    <div className={'tab-panel-content'}>
      { childSpecs.map((spec) => {
        return <div key={spec.tabKey} className={'tab-panel-content-item' + (spec.tabKey === activeTabKey ? ' active' : '')}>
          {spec.element}
        </div>
      })}
    </div>
  </div>






}