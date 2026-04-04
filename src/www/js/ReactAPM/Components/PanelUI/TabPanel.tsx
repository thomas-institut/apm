
import {Children, isValidElement, ReactElement, ReactNode} from "react";
import SimplePanel from "@/ReactAPM/Components/PanelUI/SimplePanel";
import PanelWithToolbar from "@/ReactAPM/Components/PanelUI/PanelWithToolbar";

import './panel-ui.css'

interface TabPanelChildProps {
  tabKey?: string;
  tabTitle?: string;
}


interface TabPanelChildSpec extends Required<TabPanelChildProps> {
  element: TabPanelChild;
}



type TabPanelChild =
  | ReactElement<TabPanelChildProps, typeof SimplePanel>
  | ReactElement<TabPanelChildProps, typeof PanelWithToolbar>;


const ValidTypes = [SimplePanel, PanelWithToolbar];
interface TabPanelProps {
  activeTabKey?: string;
  onClickTab?: (tabKey: string) => void;
  children: TabPanelChild | TabPanelChild[];
}
export default function TabPanel(props: TabPanelProps) {

  const children = Children.toArray(props.children) as TabPanelChild[];
  const activeTabKey = props.activeTabKey ?? children[0].props.tabKey ?? `tab-0`;

  const childSpecs: TabPanelChildSpec[] = children.map((child, index) => {
    if (!isValidElement(child)) {
      throw new Error('TabPanel children must be valid React elements');
    }
    if (!ValidTypes.includes(child.type)) {
      throw new Error('TabPanel children must be SimplePanel or PanelWithToolbar');
    }
    return {
      tabKey: child.props.tabKey ?? `tab-${index}`,
      tabTitle: child.props.tabTitle ?? `Tab ${index + 1}`,
      element: child,
    }
  });

  return <div className="tab-panel">
    <div className={'tab-panel-tabs'}>
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