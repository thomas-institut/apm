import {createRoot} from "react-dom/client";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import {useState} from "react";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import './tabPanelTest.css';
import LoremIpsumText from "@/ReactAPM/Components/LoremIpsumText";

function TabPanelTest() {

  const [activeTab, setActiveTab] = useState('home');
  return <div style={{display: 'grid', gridTemplateRows: 'auto 1fr', minHeight:'0', height: '100%', padding: '0.5rem', fontFamily: 'Arial, sans-serif'}}>
    <h1>TabPanelTest</h1>

    <div style={{height: '100%', minHeight: '0'}}>
      <TabPanel activeTabKey={activeTab} onClickTab={(tabKey) => setActiveTab(tabKey)}>
        <Panel tabKey={'home'} tabTitle={'Home'}>
          <div>This is the content of Tab 1</div>
          <LoremIpsumText paragraphs={20}/>
        </Panel>

        <Panel tabKey={'data'} tabTitle={'Data'}>
          <Toolbar>Data Toolbar</Toolbar>
          <PanelContent>
            <div>This is some data</div>
           <LoremIpsumText paragraphs={20}/>
          </PanelContent>
        </Panel>

        <Panel tabKey={'other'} tabTitle={'Other'} className={'no-padding'}>
          <Toolbar>Other Toolbar</Toolbar>
          <Panel tabKey={'other-sub'} tabTitle={'Other Sub'} >
            <Toolbar className={'second-toolbar'}>Other Sub Toolbar</Toolbar>
            <LoremIpsumText paragraphs={20}/>
          </Panel>
        </Panel>
      </TabPanel>
    </div>
  </div>
}


const root = createRoot(document.getElementById("app")!);

root.render(<TabPanelTest/>);