import {createRoot} from "react-dom/client";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import SimplePanel from "@/ReactAPM/Components/PanelUI/SimplePanel";
import PanelWithToolbar from "@/ReactAPM/Components/PanelUI/PanelWithToolbar";
import {useState} from "react";
import {LoremIpsum} from "lorem-ipsum";

const lorem = new LoremIpsum();
lorem.format = 'html';

const homeText = lorem.generateParagraphs(30);
const dataText = lorem.generateParagraphs(30);
const otherText = lorem.generateParagraphs(30);
function TabPanelTest() {

  const [activeTab, setActiveTab] = useState('home');
  return <div style={{display: 'grid', gridTemplateRows: 'auto 1fr', minHeight:'0', height: '100%', padding: '0.5rem', fontFamily: 'Arial, sans-serif'}}>
    <h1>TabPanelTest</h1>

    <div style={{height: '100%', minHeight: '0'}}>
      <TabPanel activeTabKey={activeTab} onClickTab={(tabKey) => setActiveTab(tabKey)}>

        <SimplePanel tabKey={'home'} tabTitle={'Home'}>
          <div>This is the content of Tab 1</div>
          <div dangerouslySetInnerHTML={{__html: homeText}}/>
        </SimplePanel>

        <PanelWithToolbar tabKey={'data'} tabTitle={'Data'} toolbar={'the toolbar'}>
          <div>This is some data</div>
          <div dangerouslySetInnerHTML={{__html: dataText}}/>
        </PanelWithToolbar>

        <PanelWithToolbar tabKey={'other'} tabTitle={'Other'} toolbar={'Other Toolbar'} contentClassName={'no-padding'}>
          <PanelWithToolbar tabKey={'other-sub'} tabTitle={'Other Sub'} toolbar={'Other Sub Toolbar'} >
            <div dangerouslySetInnerHTML={{__html: otherText}}/>
          </PanelWithToolbar>
        </PanelWithToolbar>
      </TabPanel>
    </div>
  </div>
}


const root = createRoot(document.getElementById("app")!);

root.render(<TabPanelTest/>);