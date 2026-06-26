import {useParams} from "react-router";
import {useState} from "react";
import {Button} from "react-bootstrap";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";

import './mce-composer.css';

export default function MceComposer() {

  const {id} = useParams();

  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [activeTab, setActiveTab] = useState('edition');

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

  return (<div className="mce-composer-container">
    <div className="header">
      <div className={'logo'}><img src={'../../../public/apm-logo.svg'} alt={'APM logo'} height={'40px'}/></div>
      <div className={'title'}>MultiChunk Edition {id}</div>
      <div className={'controls'}>
        <Button variant={"outline-primary"} size={"sm"} onClick={toggleDirection}>Toggle Direction</Button>
      </div>
    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={5}
                 outerMargin={10} onResize={handleResize}>
      <TabPanel activeTabKey={activeTab} onClickTab={(tabKey) => setActiveTab(tabKey)}>
        <Panel tabKey={'edition'} tabTitle={'Edition'}>

          <PanelContent className={'padding-1'}>
            <p>Edition panel</p>
          </PanelContent>
        </Panel>
        <Panel tabKey={'search'} tabTitle={'Chunk Search'}>
          <PanelContent className={'padding-1'}>
            <p>Chunk search will be here...</p>
          </PanelContent>
        </Panel>
      </TabPanel>
      <TabPanel>
        <Panel tabKey={'preview'} tabTitle={'Preview'}>
          <Toolbar className={'preview-toolbar'}>Toolbar 3</Toolbar>
          <PanelContent className={'padding-1'}>
            <p>Edition Preview will be here...</p>
          </PanelContent>
        </Panel>
      </TabPanel>

    </SplitPanels>
  </div>);
}