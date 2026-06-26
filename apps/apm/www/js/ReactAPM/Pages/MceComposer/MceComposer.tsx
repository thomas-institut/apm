import {useParams} from "react-router";
import {useContext, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";

import './mce-composer.css';
import {CloudArrowUp, LayoutSplit} from "react-bootstrap-icons";

import {MceData} from '@/MceData/MceData';
import {useQuery} from "@tanstack/react-query";
import {AppContext} from "@/ReactAPM/App";
import EditionPanel from "@/ReactAPM/Pages/MceComposer/EditionPanel";

export default function MceComposer() {

  const {id} = useParams();
  const appContext = useContext(AppContext);

  const paramId = id ?? '';

  let mceDataId = -1;

  if (paramId === '') {
    throw new Error('Invalid MCE ID');
  }
  mceDataId = parseInt(paramId);
  if (isNaN(mceDataId)) {
    throw new Error('Invalid MCE ID');
  }

  const getMceData = async (numericalId: number) => {
    if (numericalId === -1) {
      return {
        authorTid: -1,
        chunks: [],
        mceData: MceData.createEmpty(),
        validFrom: '',
        validUntil: '',
        versionDescription: '',
      };
    }
    if (isNaN(numericalId)) {
      throw new Error('Invalid MCE ID');
    }
    return appContext.apiClient.getMceData(numericalId);
  }

  const mceDataQueryResult = useQuery({
    queryKey: ['mceData', mceDataId],
    queryFn: () => getMceData(mceDataId),
  });



  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [activeTab, setActiveTab] = useState('edition');
  const [changes, setChanges] = useState(false);


  if (mceDataQueryResult.status === 'pending') {
    return <div>Loading edition {id}...</div>
  }

  if (mceDataQueryResult.status === 'error') {
    return <div>Error loading edition {id}</div>
  }

  const apiMceDeata = mceDataQueryResult.data!;

  console.log(`API MceData for edition ${mceDataId}:`, apiMceDeata);

  const mceData = apiMceDeata.mceData;

  document.title = mceData.title;


  const handleClickDirectionIcon = (horizontalIcon: boolean) => {
    if (horizontalIcon) {
      setDirection('vertical');
    } else {
      setDirection('horizontal');
    }
  };

  const handleResize = (firstRatio: number, secondRatio: number) => {
    console.log("handleResize", firstRatio, secondRatio);
  };

  const SaveIcon = () => {
    if (changes) {
      return <CloudArrowUp className={'tb-icon tb-icon-active'}/>
    }
    return <CloudArrowUp className={'tb-icon tb-icon-disabled'} title={'Nothing to save'}/>
  }

  return (<div className="mce-composer-container">
    <div className="header">
      <div className={'logo'}><img src={'../../../public/apm-logo.svg'} alt={'APM logo'} height={'40px'}/></div>
      <div className={'title'}>{mceData.title}</div>
      <div className={'controls'}>
        <LayoutSplit className={'tb-icon'} title={'Switch to vertical layout'} onClick={() => handleClickDirectionIcon(true)}/>
        <LayoutSplit className={'fa-rotate-90 tb-icon'} title={'Switch to horizontal layout'} onClick={() => handleClickDirectionIcon(false)}/>
        <SaveIcon/>
      </div>
    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={5}
                 outerMargin={10} onResize={handleResize}>
      <TabPanel activeTabKey={activeTab} onClickTab={(tabKey) => setActiveTab(tabKey)}>
        <Panel tabKey={'edition'} tabTitle={'Edition'}>
          <PanelContent className={'padding-1'}>
            <EditionPanel mceData={mceData}/>
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