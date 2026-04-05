import '../../node_modules/bootstrap5/dist/css/bootstrap.css';
import './splitPanelsTest.css';
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import {createRoot} from "react-dom/client";
import {useState} from "react";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import LoremIpsumText from "@/ReactAPM/Components/LoremIpsumText";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import { Button } from "react-bootstrap";


export function SplitPanelsTest() {

  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [activeTab, setActiveTab] = useState('tab1');

  const toggleDirection = () => {
    if (direction === 'horizontal') {
      setDirection('vertical');
    } else {
      setDirection('horizontal');
    }
  };

  const handleResize = (firstRatio: number, secondRatio: number) => {
    console.log("handleResize", firstRatio, secondRatio);
  };

  return (<div className="app">
    <div className="header">
      <h1>Split Panels Test</h1>
      <Button variant={"outline-primary"} size={"sm"} onClick={toggleDirection}>Toggle Direction</Button>

    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={5} outerMargin={10} onResize={handleResize}>
      <Panel className={"padding-1 border-1"}>
        <h3>This is the first panel</h3>
        <LoremIpsumText paragraphs={20}/>
      </Panel>
      <TabPanel activeTabKey={activeTab} onClickTab={(tabKey) => setActiveTab(tabKey)}>
        <Panel tabKey={'tab1'} tabTitle={'Tab 1'}>
          <Toolbar className={'my-toolbar'}>Toolbar 1</Toolbar>
          <PanelContent className={'padding-1'}>
            <p>This is the second panel</p>
            <LoremIpsumText paragraphs={20}/>
          </PanelContent>
        </Panel>
        <Panel tabKey={'tab2'} tabTitle={'Tab 2'}>
          <Toolbar className={'my-toolbar'}>Toolbar 2</Toolbar>
          <PanelContent className={'padding-1'}>
            <p>This is the second panel</p>
            <LoremIpsumText paragraphs={20}/>
          </PanelContent>
        </Panel>
        <Panel tabKey={'tab3'} tabTitle={'Tab 3'}>
          <Toolbar className={'my-toolbar'}>Toolbar 3</Toolbar>
          <Panel>
            <Toolbar className={'my-toolbar'}>A second toolbar</Toolbar>
            <PanelContent className={'padding-1'}>
              <p>This is the second panel</p>
              <LoremIpsumText paragraphs={20}/>
            </PanelContent>
          </Panel>
        </Panel>
      </TabPanel>

    </SplitPanels>
  </div>);
}


const root = createRoot(document.getElementById("app")!);

root.render(<SplitPanelsTest/>);