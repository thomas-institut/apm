import {useParams} from "react-router";
import {useContext, useEffect, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import './mce-composer.css';
import {LayoutSplit} from "react-bootstrap-icons";
import {MceData} from '@/MceData/MceData';
import {useQuery} from "@tanstack/react-query";
import {AppContext} from "@/ReactAPM/App";
import EditionPanel, {CtDataState, CtDataStatus} from "@/ReactAPM/Pages/MceComposer/EditionPanel";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import {MceDataInterface} from "@/MceData/MceDataInterface";
import {deepCopy} from "@/toolbox/Util";
import SaveIcon from "@/ReactAPM/Pages/MceComposer/SaveIcon";


type MceDataLoadStatus = 'loading' | 'justLoaded' | 'loaded';

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
    const resp = await appContext.apiClient.getMceData(numericalId);
    console.log(`Got MCE data for edition ${numericalId}`, resp);
    return resp;
  };

  const mceDataQueryResult = useQuery({
    queryKey: ['mceData', mceDataId],
    queryFn: () => getMceData(mceDataId),
  });

  const [mceDataLoadStatus, setMceDataLoadStatus] = useState<MceDataLoadStatus>('loading');
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [activeTab, setActiveTab] = useState('edition');
  const [changes, setChanges] = useState<string[]>([]);
  const [ctDataStatusArray, setCtDataStatusArray] = useState<CtDataStatus[]>([]);
  const [title, setTitle] = useState<string>('Loading...');
  const [lastSavedMceData, setLastSavedMceData] = useState<MceDataInterface | null>(null);


  useEffect(() => {
    if (mceDataLoadStatus === 'loaded') {
      // find first ctData not loaded
      const firstCtDataNotLoaded = ctDataStatusArray.find((ctDataStatus) => ctDataStatus.ctDataState === 'loading');
      if (!firstCtDataNotLoaded) {
        return;
      }
      const ctDataId = firstCtDataNotLoaded.ctDataId;
      const ctDataStatusIndex = ctDataStatusArray.findIndex((ctDataStatus) => ctDataStatus.ctDataId === ctDataId);
      console.log(`Loading CtData for chunk ${ctDataStatusIndex}, table ${ctDataId}`);
      appContext.apiClient.getSingleChunkData(ctDataId, '').then((apiResponse) => {
        console.log(`Got data for chunk ${ctDataStatusIndex}, table ${ctDataId}`, apiResponse);
        const ctData = apiResponse.ctData;
        setCtDataStatusArray((prevCtDataStatusArray) => {
          const newCtDataStatusArray = [...prevCtDataStatusArray];
          newCtDataStatusArray[ctDataStatusIndex] = {
            ...newCtDataStatusArray[ctDataStatusIndex],
            ctDataState: 'loaded',
            ctData: ctData
          };
          return newCtDataStatusArray;
        });
      });
    }
  }, [mceDataLoadStatus, ctDataStatusArray]);


  useEffect(() => {
    if (mceDataQueryResult.data) {
      const newTitle = mceDataQueryResult.data.mceData.title;
      setTitle(newTitle);
      document.title = newTitle;
      setLastSavedMceData(deepCopy(mceDataQueryResult.data.mceData));
    }
  }, [mceDataQueryResult.data]);


  if (mceDataQueryResult.status === 'pending') {
    return <div>Loading edition {id}...</div>;
  }

  if (mceDataQueryResult.status === 'error') {
    return <div>Error loading edition {id}</div>;
  }

  if (mceDataLoadStatus === 'loading') {
    setMceDataLoadStatus('justLoaded');
  }

  const apiMceData = mceDataQueryResult.data!;
  const mceData = apiMceData.mceData;

  if (mceDataLoadStatus === 'justLoaded') {
    setCtDataStatusArray(mceData.chunks.map((chunk) => (
      {ctDataId: chunk.chunkEditionTableId, ctData: null, ctDataState: 'loading' as CtDataState, errorMsg: ''}
    )));
    setMceDataLoadStatus('loaded');
  }

  const checkForChanges = () => {
    if (lastSavedMceData === null) {
      console.warn(`Checking for changes but no last saved MCE data available`);
      return;
    }
    const newChanges: string[] = [];
    if (mceData.title !== lastSavedMceData.title) {
      newChanges.push(`New title: '${mceData.title}'`);
    }
    setChanges(newChanges);
  };

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

  const handleConfirmTitleEdit = (newTitle: string) => {
    const sanitizedTitle = newTitle.trim();
    setTitle(sanitizedTitle);
    document.title = sanitizedTitle;
    mceData.title = sanitizedTitle;
    checkForChanges();
  };

  return (<div className="mce-composer-container">
    <div className="header">
      <div className={'logo'}><img src={'../../../public/apm-logo.svg'} alt={'APM logo'} height={'40px'}/></div>
      <EditableTextField className={'title'} editingClassName={'title editing'} text={title}
                         onConfirm={handleConfirmTitleEdit}/>
      <div className={'controls'}>
        <LayoutSplit className={'tb-icon'} title={'Switch to vertical layout'}
                     onClick={() => handleClickDirectionIcon(true)}/>
        <LayoutSplit className={'fa-rotate-90 tb-icon'} title={'Switch to horizontal layout'}
                     onClick={() => handleClickDirectionIcon(false)}/>
        <SaveIcon changes={changes}/>
      </div>
    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={5}
                 outerMargin={10} onResize={handleResize}>
      <TabPanel activeTabKey={activeTab} onClickTab={(tabKey) => setActiveTab(tabKey)}>
        <Panel tabKey={'edition'} tabTitle={'Edition'}>
          <PanelContent className={'padding-1'}>
            <EditionPanel mceData={mceData} ctDataStatusArray={ctDataStatusArray}/>
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