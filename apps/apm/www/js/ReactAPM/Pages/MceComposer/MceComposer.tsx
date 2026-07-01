import {useParams} from "react-router";
import {JSX, useContext, useEffect, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import './mce-composer.css';
import {ArrowsAngleContract, ChevronRight, LayoutSplit} from "react-bootstrap-icons";
import {MceData} from '@/MceData/MceData';
import {useQuery} from "@tanstack/react-query";
import {AppContext} from "@/ReactAPM/App";
import ChunksPanel from "@/ReactAPM/Pages/MceComposer/ChunksPanel";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import {ChunkInMceData, MceDataInterface} from "@/MceData/MceDataInterface";
import {deepCopy} from "@/toolbox/Util";
import SaveIcon from "@/ReactAPM/Pages/MceComposer/SaveIcon";
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";
import SiglaPanel from "@/ReactAPM/Pages/MceComposer/SiglaPanel";
import SiglaGroupsPanel from "@/ReactAPM/Pages/MceComposer/SiglaGroupsPanel";
import ProgressBar from "@/ReactAPM/Components/ProgressBar/ProgressBar";


type MceDataLoadStatus = 'loading' | 'justLoaded' | 'loaded';

export type CtDataState = 'loading' | 'loaded' | 'error';

export interface CtDataStatus {
  ctDataId: number;
  chunkInMceData: ChunkInMceData;
  apiData: null | SingleChunkApiData;
  ctDataState: CtDataState;
  errorMsg: string;
}

interface PanelSpec {
  panel: 'one' | 'two';
  key: string;
  title: string;
  expandable?: boolean;
  closable?: boolean;
  content: JSX.Element;
}

export default function MceComposer() {

  const {id} = useParams();
  const appContext = useContext(AppContext);
  const paramId = id ?? '';
  const shimWidth = 5;

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
  const [activeTabPanelOne, setActiveTabPanelOne] = useState('chunks');
  const [activeTabPanelTwo, setActiveTabPanelTwo] = useState('preview');
  const [changes, setChanges] = useState<string[]>([]);
  const [ctDataStatusArray, setCtDataStatusArray] = useState<CtDataStatus[]>([]);
  const [title, setTitle] = useState<string>('Loading...');
  const [lastSavedMceData, setLastSavedMceData] = useState<MceDataInterface | null>(null);
  const [expandedTab, setExpandedTab] = useState<string | null>(null);


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
      const ctDataStatus = ctDataStatusArray[ctDataStatusIndex];
      appContext.apiClient.getSingleChunkData(ctDataId, ctDataStatus.chunkInMceData.version).then((apiResponse) => {
        console.log(`Got data for chunk ${ctDataStatusIndex}, table ${ctDataId}`, apiResponse);
        setCtDataStatusArray((prevCtDataStatusArray) => {
          const newCtDataStatusArray = [...prevCtDataStatusArray];
          newCtDataStatusArray[ctDataStatusIndex] = {
            ...newCtDataStatusArray[ctDataStatusIndex],
            apiData: apiResponse,
            ctDataState: 'loaded',
          };
          return newCtDataStatusArray;
        });
      });
    }
  }, [mceDataLoadStatus, ctDataStatusArray]);

  useEffect(() => {
    if (mceDataQueryResult.data) {
      const mceTitle = mceDataQueryResult.data.mceData.title;
      setTitle(mceTitle);
      document.title = `E: ${mceTitle}`;
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
      {
        ctDataId: chunk.chunkEditionTableId,
        chunkInMceData: chunk,
        apiData: null,
        ctDataState: 'loading' as CtDataState,
        errorMsg: ''
      }
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

  const handleResize = (_firstRatio: number, _secondRatio: number) => {
    // console.log("handleResize", firstRatio, secondRatio);
  };

  const deleteChunk = (chunkIndex: number) => {
    console.log("deleteChunk", chunkIndex);
  };

  const moveChunk = (chunkIndex: number, direction: 'up' | 'down') => {
    console.log(`Move chunk index ${chunkIndex} '${direction}'`);
  };

  const updateChunk = (chunkIndex: number) => {
    console.log(`Update chunk index ${chunkIndex}`);
  };

  const handleConfirmTitleEdit = (newTitle: string) => {
    const sanitizedTitle = newTitle.trim();
    setTitle(sanitizedTitle);
    document.title = sanitizedTitle;
    mceData.title = sanitizedTitle;
    checkForChanges();
  };

  const handleOnClickTabExpand = (tabKey: string) => {
    console.log(`Click on expand tab ${tabKey}`);
    setExpandedTab(tabKey);
  };

  const handleOnClickCollapseTab = () => {
    console.log(`Click on collapse icon`);
    setExpandedTab(null);
  };

  const panelSpecs: PanelSpec[] = [
    {
      panel: 'one',
      key: 'chunks',
      title: 'Chunks',
      expandable: true,
      content: <ChunksPanel mceData={mceData}
                            ctDataStatusArray={ctDataStatusArray}
                            moveChunk={(chunkIndex, direction) => {
                              moveChunk(chunkIndex, direction);
                            }}
                            updateChunk={(chunkIndex) => {
                              updateChunk(chunkIndex);
                            }}
                            deleteChunk={(chunkIndex) => {
                              deleteChunk(chunkIndex);
                            }}
      />
    },
    {
      panel: 'one',
      key: 'sigla',
      title: 'Witnesses and Sigla',
      content: <SiglaPanel mceData={mceData}/>
    },
    {
      panel: 'one',
      key: 'siglaGroups',
      title: 'Sigla Groups',
      content: <SiglaGroupsPanel mceData={mceData}/>
    },
    {
      panel: 'one',
      key: 'normalization',
      title: 'Main Text Normalization',
      expandable: true,
      content: <>Main text normalization will be here...</>
    },
    {
      panel: 'two',
      key: 'preview',
      title: 'Preview',
      expandable: true,
      content: <>
        <Toolbar className={'preview-toolbar'}>Toolbar 3</Toolbar>
        <PanelContent className={'padding-1'}>
          <p>Edition Preview will be here...</p>
        </PanelContent>
      </>
    },
    {
      panel: 'two',
      key: 'addChunks',
      title: 'Add Chunks',
      expandable: true,
      content: <>Add chunks will be here...</>
    },
    {
      panel: 'two',
      key: 'versions',
      title: 'Versions',
      expandable: true,
      closable: true,
      content: <>Versions will be here...</>
    }
  ];


  const numChunks = ctDataStatusArray.length;
  const loadedCtDataCount = ctDataStatusArray.filter((ctDataStatus) => ctDataStatus.ctDataState === 'loaded').length;
  const allCtDataStatusLoaded = loadedCtDataCount === numChunks;


  let loadingProgress: JSX.Element | null = null;

  if (!allCtDataStatusLoaded) {
    loadingProgress = <ProgressBar currentStep={loadedCtDataCount}
                                   width={200}
                                   className={'chunk-progress-bar'}
                                   numSteps={numChunks}
                                   getLabel={(s, ns) => {
                                     return `Loading chunk ${s} of ${ns}`;
                                   }}/>;
  }


  let expandedTabSpec: PanelSpec | null = null;

  if (expandedTab !== null) {
    expandedTabSpec = panelSpecs.find(spec => spec.key === expandedTab) ?? null;
  }

  const notificationsDiv = <div className={'notifications'}>
    {!allCtDataStatusLoaded && loadingProgress}
  </div>;

  if (expandedTabSpec !== null) {
    return (
      <div className="mce-composer-container expanded">
        <div className="header">
          <div className={'logo'}><img src={'../../../public/apm-logo.svg'} alt={'APM logo'}/></div>
          <div className={'expanded-tab-title-area'}>
            <span className={'title'}>{title}</span>
            <ChevronRight/>
            <span className={'tab-name'}>{expandedTabSpec.title}</span>
            <ArrowsAngleContract className={'tb-icon'} onClick={() => handleOnClickCollapseTab()}/>
          </div>
          {notificationsDiv}
          <div className={'controls'}>
            <SaveIcon changes={changes}/>
          </div>
        </div>
        <div className={'expanded-panel'}>
          {expandedTabSpec.content}
        </div>
      </div>
    );
  }

  return (<div className="mce-composer-container">
    <div className="header">
      <div className={'logo'}><img src={'../../../public/apm-logo.svg'} alt={'APM logo'}/></div>
      <EditableTextField className={'title'} editingClassName={'title editing'} text={title}
                         onConfirm={handleConfirmTitleEdit}/>
      {notificationsDiv}
      <div className={'controls'}>
        <LayoutSplit className={'tb-icon'} title={'Switch to vertical layout'}
                     onClick={() => handleClickDirectionIcon(true)}/>
        <LayoutSplit className={'fa-rotate-90 tb-icon'} title={'Switch to horizontal layout'}
                     onClick={() => handleClickDirectionIcon(false)}/>
        <SaveIcon changes={changes}/>
      </div>
    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={3}
                 outerMargin={10} onResize={handleResize}>
      <TabPanel activeTabKey={activeTabPanelOne}
                onClickTab={(tabKey) => setActiveTabPanelOne(tabKey)}
                onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelSpecs.filter(panelSpec => panelSpec.panel === 'one')
          .map((panelSpec) => <Panel tabKey={panelSpec.key}
                                     tabTitle={panelSpec.title}
                                     closable={panelSpec.closable ?? false}
                                     expandable={panelSpec.expandable ?? false}>
            {panelSpec.content}
          </Panel>)}
      </TabPanel>
      <TabPanel activeTabKey={activeTabPanelTwo}
                onClickTab={(tabKey) => setActiveTabPanelTwo(tabKey)}
                onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelSpecs.filter(panelSpec => panelSpec.panel === 'two')
          .map((panelSpec) => <Panel tabKey={panelSpec.key}
                                     tabTitle={panelSpec.title}
                                     closable={panelSpec.closable ?? false}
                                     expandable={panelSpec.expandable ?? false}>
            {panelSpec.content}
          </Panel>)}
      </TabPanel>
    </SplitPanels>
  </div>);
}