import 'bootstrap/dist/css/bootstrap.min.css'
import './splitPanelsTest.css';
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import {createRoot} from "react-dom/client";
import {CSSProperties, useState} from "react";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import LoremIpsumText from "@/ReactAPM/Components/LoremIpsumText";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import { Button } from "react-bootstrap";


export function SplitPanelsTest() {

  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [activeTab, setActiveTab] = useState('tab1');

  const [panelOneTest, setPanelOneTest] = useState<number>(0);

  const handleClickChangePanelOne = () => {
    if (panelOneTest < panelOneTests.length - 1) {
      setPanelOneTest(panelOneTest + 1);
    } else {
      setPanelOneTest(0);
    }
  }

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


  const panelOneTests = [
    <div className={"padding-1 border-1"} style={{
      overflow: 'auto',
      height: '100%',
      minHeight: 0,
      boxSizing: 'border-box',
    }}>
      <h1>Div element</h1>
      <p>This is a simple div with the right styles</p>
      <LoremIpsumText paragraphs={20}/>
    </div>,

    <PanelContent  className={"padding-1 border-1"}>
      <h1>Panel Content</h1>
      <p>This is a PanelContent component</p>
      <LoremIpsumText paragraphs={20}/>
    </PanelContent>,

    <Panel className={"padding-1 border-1"}>
      <h1>Panel</h1>
      <p>This is a Panel component</p>
      <LoremIpsumText paragraphs={20}/>
    </Panel>,

    <SplitPanels direction={direction === 'horizontal' ? 'vertical' : 'horizontal'} className="paddin-1" dividerClass="divider" dividerWidth={5} outerMargin={0}>
      <Panel className={"padding-1 border-1"}>
        <h1>Split Panels</h1>
        <p>This is the top panel</p>
        <LoremIpsumText paragraphs={20}/>
      </Panel>
      <Panel className={"padding-1 border-1"}>
        <Toolbar className={'my-toolbar'}>This is the bottom panel</Toolbar>
        <LoremIpsumText paragraphs={20}/>
      </Panel>
    </SplitPanels>,

    <MyCustomComponent label={'A custom panel'}/>
  ]

  return (<div className="app">
    <div className="header">
      <h1>Split Panels Test</h1>
      <Button variant={"outline-primary"} size={"sm"} onClick={() => handleClickChangePanelOne()}>Change Panel One</Button>
      <Button variant={"outline-primary"} size={"sm"} onClick={toggleDirection}>Toggle Direction</Button>
    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={5} outerMargin={10} onResize={handleResize}>
      { panelOneTests[panelOneTest]}
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
        <MyCustomComponent tabKey={'tab4'} tabTitle={'Tab 4'} label={'Hello'} className={'panel-content'}/>
      </TabPanel>

    </SplitPanels>
  </div>);
}

interface MyTabComponentProps
{
  tabKey?: string;
  tabTitle?: string;
  label: string;
  className?: string;
}

function MyCustomComponent(props: MyTabComponentProps)
{

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    gap: 0,
    overflow: 'hidden',
    height: '100%',
    boxSizing: 'border-box',
    border: '1px solid silver',

  }

  const toolbarStyle: CSSProperties = {
    overflow: 'hidden',
    background: 'lightgray',
    padding: '0.25em'
  }

  const bodyStyle: CSSProperties = {
    overflow: 'auto',
    height: '100%',
    boxSizing: 'border-box',
    padding: '0.25em'
  }

  return (
    <div style={containerStyle} className={props.className ?? ''}>
      <div style={toolbarStyle}>This is fixed at the top</div>
      <div style={bodyStyle}>
        <h1>{props.label}</h1>
        <p>This is a custom component</p>
        { props.tabKey && <p>I'm being used inside a tab</p>}
        { !props.tabKey && <p>I'm not being used inside a tab</p>}
        <LoremIpsumText paragraphs={20}/>
      </div>
      <div style={toolbarStyle}>This is fixed at the bottom</div>
    </div>
  );
}

const root = createRoot(document.getElementById("app")!);

root.render(<SplitPanelsTest/>);