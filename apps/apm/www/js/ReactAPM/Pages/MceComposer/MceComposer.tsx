import {useParams} from "react-router";
import {cloneElement, JSX, useContext, useEffect, useRef, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import {ArrowsAngleContract, ChevronRight, LayoutSplit} from "react-bootstrap-icons";
import {MceData} from '@/MceData/MceData';
import {AppContext} from "@/ReactAPM/App";
import ChunksPanel from "@/ReactAPM/Pages/MceComposer/ChunksPanel";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import {ChunkInMceData, MceDataInterface} from "@/MceData/MceDataInterface";
import {deepCopy} from "@/toolbox/Util";
import SaveButton from "@/ReactAPM/Pages/MceComposer/SaveButton";
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";
import WitnessesPanel from "@/ReactAPM/Pages/MceComposer/WitnessesPanel";
import ProgressBar from "@/ReactAPM/Components/ProgressBar/ProgressBar";
import {Edition} from "@/Edition/Edition";
import {MceDataEditionGenerator} from "@/MceData/MceDataEditionGenerator";
import {BasicProfiler} from "@/toolbox/BasicProfiler";
import MainTextPanel from "@/ReactAPM/Pages/MceComposer/MainTextPanel";
import ApmLogo from "@/ReactAPM/Components/ApmLogo/ApmLogo";
import {StatusPage} from "@/ReactAPM/Pages/MceComposer/StatusPage";
import './MceComposer.css';

export type CtDataState = 'loading' | 'loaded' | 'error';

type MceComposerStatus =
  'start'
  | 'loadingMce'
  | 'loadingSingleChunks'
  | 'loaded'
  | 'error';

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
  className?: string;
  expandable?: boolean;
  closable?: boolean;
  content: JSX.Element;
  tabbable?: boolean;
}

export default function MceComposer() {

  const [mceComposerStatus, setMceComposerStatus] = useState<MceComposerStatus>('loadingMce');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ctDataStatusArray, setCtDataStatusArray] = useState<CtDataStatus[]>([]);
  const [title, setTitle] = useState<string>('Loading...');
  const [lastSavedMceData, setLastSavedMceData] = useState<MceDataInterface | null>(null);
  const [mceData, setMceData] = useState<MceDataInterface>(MceData.createEmpty());
  const [edition, setEdition] = useState<Edition | null>(null);

  const [editionGenerationProgress, setEditionGenerationProgress] = useState<number | null>(null);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [activeTabPanelOne, setActiveTabPanelOne] = useState('chunks');
  const [activeTabPanelTwo, setActiveTabPanelTwo] = useState('mainText');
  const [changes, setChanges] = useState<string[]>([]);
  const [expandedTab, setExpandedTab] = useState<string | null>(null);

  const singleChunkEditionCache = useRef<Record<number, Edition>>([]);
  const shimWidth = 5;

  const {id} = useParams();
  const appContext = useContext(AppContext);
  let mceDataId = -1;

  if (id === undefined) {
    setMceComposerStatus('error');
    setErrorMsg('MCE ID is undefined');
  } else {
    if (id !== 'new') {
      // should be a valid numerical id
      if (isNaN(parseInt(id))) {
        console.log('Invalid MCE ID: NaN');
        setMceComposerStatus('error');
        setErrorMsg('Invalid MCE ID');
      } else {
        mceDataId = parseInt(id);
        if (mceDataId <= 0) {
          console.log('Invalid MCE ID: negative or zero');
          setMceComposerStatus('error');
          setErrorMsg('Invalid MCE ID');
        }
      }
    }
  }


  /**
   * Data loading and processing
   */
  useEffect(() => {
    switch (mceComposerStatus) {
      case 'start':
        setMceComposerStatus('loadingMce');
        break;

      case 'loadingMce':
        if (mceDataId === -1) {
          // new edition, no Mce to load from server
          // no need to set MceData, since by default mceData is an empty edition
          setMceComposerStatus('loadingSingleChunks');
        } else {
          appContext.apiClient.getMceData(mceDataId).then((resp) => {
            const mceTitle = resp.mceData.title;
            setTitle(mceTitle);
            document.title = `MCE: ${mceTitle}`;
            setLastSavedMceData(deepCopy(resp.mceData));
            setMceData(resp.mceData);
            setCtDataStatusArray(resp.mceData.chunks.map((chunk) => (
              {
                ctDataId: chunk.chunkEditionTableId,
                chunkInMceData: chunk,
                apiData: null,
                ctDataState: 'loading' as CtDataState,
                errorMsg: ''
              }
            )));
            setMceComposerStatus('loadingSingleChunks');
          }).catch((error) => {
            setMceComposerStatus('error');
            setErrorMsg(`Failed to load MCE data from server: ${error.message}`);
          });
        }
        break;

      case 'loadingSingleChunks':
        const firstCtDataNotLoaded = ctDataStatusArray.find((ctDataStatus) => ctDataStatus.ctDataState === 'loading');
        if (!firstCtDataNotLoaded) {
          if (ctDataStatusArray.every((ctDataStatus) => ctDataStatus.ctDataState === 'loaded')) {
            setMceComposerStatus('loaded');
          } else {
            console.warn(`All chunks are not loaded yet, but can't find a chunk to load`);
            setMceComposerStatus('error');
            setErrorMsg(`Inconsistent state reached trying to load chunks`);
          }
          break;
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
  }, [mceComposerStatus, ctDataStatusArray]);

  useEffect(() => {
    if (mceComposerStatus !== 'loaded') {
      return;
    }
    if (edition !== null) {
      return;
    }

    const profiler = new BasicProfiler('RegenerateEdition', true);

    const generator = new MceDataEditionGenerator({
      ctDataGetter: async (mceData: MceDataInterface, chunkIndex: number) => {
        const chunk = mceData.chunks[chunkIndex];
        const data = await appContext.apiClient.getSingleChunkData(chunk.chunkEditionTableId, chunk.version, true);
        return data.ctData;
      },
      singleChunkEditionGetter: async (_mceData: MceDataInterface, chunkIndex: number) => {
        return singleChunkEditionCache.current[chunkIndex] ?? null;
      },
      singleChunkEditionSaver: async (_mceData: MceDataInterface, chunkIndex: number, edition) => {
        singleChunkEditionCache.current[chunkIndex] = new Edition().setFromInterface(edition);
      },
      onProgressUpdate: (step, numSteps) => {
        setEditionGenerationProgress(step / numSteps);
        return Promise.resolve();
      }
    });

    generator.generate(mceData, mceDataId).then((generatedEdition) => {
      profiler.stop();
      setEdition(new Edition().setFromInterface(generatedEdition));
      setEditionGenerationProgress(null);
    }).catch((e) => {
      console.error(e);
    });
  }, [mceComposerStatus, edition]);


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

  const setChunkBreak = (chunkIndex: number, breakAfter: string) => {
    console.log(`Set chunk break index ${chunkIndex} '${breakAfter}'`);
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
      content: <ChunksPanel chunks={mceData.chunks}
                            chunkOrder={mceData.chunkOrder ?? MceData.getDefaultChunkOrder(mceData)}
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
                            setChunkBreak={(chunkIndex, breakAfter) => {
                              setChunkBreak(chunkIndex, breakAfter);
                            }}
      />,
      tabbable: true,
    },
    {
      panel: 'one',
      key: 'witnesses',
      title: 'Witnesses',
      content: <WitnessesPanel mceData={mceData}/>,
      tabbable: true,
    },
    {
      panel: 'one',
      key: 'normalization',
      title: 'Normalization',
      expandable: true,
      content: <>Main text normalization will be here...</>
    },
    {
      panel: 'two',
      key: 'mainText',
      title: 'Edition Text',
      expandable: true,
      content: <MainTextPanel edition={edition} generationProgress={editionGenerationProgress}/>,
      tabbable: true,
    },
    {
      panel: 'two',
      key: 'preview',
      title: 'Preview',
      expandable: true,
      className: 'preview-panel',
      content: <Panel>
        <Toolbar className={'preview-toolbar'}>Preview Toolbar</Toolbar>
        <PanelContent>
          Preview will be here...
        </PanelContent>
      </Panel>,
      tabbable: true,
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

  if (mceComposerStatus === 'error') {
    return <StatusPage label={'Error'}>
      <h2>Oops!</h2>
      <p className={'text-danger'}>{errorMsg}</p>
      <p>This may be a bug, please report it.</p>
    </StatusPage>;
  }

  if (mceComposerStatus === 'loadingMce') {
    return <StatusPage label={'Edition'}>Loading edition {mceDataId}...</StatusPage>;
  }

  if (mceComposerStatus === 'start') {
    return <StatusPage label={'Edition'}>Starting...</StatusPage>;
  }

  // mceComposerStatus === 'loadingSingleChunks'  || mceComposerStatus === 'loaded'

  const numChunks = ctDataStatusArray.length;


  let loadingProgress: JSX.Element | null = null;

  if (mceComposerStatus !== 'loaded') {
    const loadedCtDataCount = ctDataStatusArray.filter((ctDataStatus) => ctDataStatus.ctDataState === 'loaded').length;
    loadingProgress = <ProgressBar currentStep={loadedCtDataCount}
                                   width={200}
                                   className={'chunk-progress-bar'}
                                   numSteps={numChunks}
                                   getLabel={(s, ns) => {
                                     return `Loading chunk ${s} of ${ns}`;
                                   }}/>;
  }

  let editionGenerationProgressBar: JSX.Element | null = null;

  if (editionGenerationProgress !== null) {
    editionGenerationProgressBar = <ProgressBar currentStep={editionGenerationProgress}
                                                width={200}
                                                className={'edition-generation-progress-bar'}
                                                numSteps={1}
                                                getLabel={(s, _ns) => {
                                                  return `Generating edition... ${Math.round(s * 100)}%`;
                                                }}/>;
  }


  let expandedTabSpec: PanelSpec | null = null;

  if (expandedTab !== null) {
    expandedTabSpec = panelSpecs.find(spec => spec.key === expandedTab) ?? null;
  }

  const notificationsDiv = <div className={'notifications'}>
    {mceComposerStatus === 'loadingSingleChunks' && loadingProgress}
    {editionGenerationProgressBar}
  </div>;

  if (expandedTabSpec !== null) {
    return (
      <div className="mce-composer expanded">
        <div className="header">
          <ApmLogo height={30} className={'logo'}/>
          <div className={'expanded-tab-title-area'}>
            <span className={'title'}>{title}</span>
            <ChevronRight/>
            <span className={'tab-name'}>{expandedTabSpec.title}</span>
            <ArrowsAngleContract className={'icon-btn'} onClick={() => handleOnClickCollapseTab()}/>
          </div>
          {notificationsDiv}
          <div className={'controls'}>
            <SaveButton changes={changes}/>
          </div>
        </div>
        {expandedTabSpec.tabbable && cloneElement(expandedTabSpec.content, {className: expandedTabSpec.className ?? ''})}
        {!expandedTabSpec.tabbable &&
          <Panel className={expandedTabSpec.className ?? ''}>{expandedTabSpec.content}</Panel>}
      </div>
    );
  }

  const panelsFromSpecs = (panelSpecs: PanelSpec[], panel: 'one' | 'two') => {
    return panelSpecs.filter(panelSpec => panelSpec.panel === panel)
      .map((panelSpec) => {
        if (panelSpec.tabbable) {
          return cloneElement(panelSpec.content, {
            tabKey: panelSpec.key,
            tabTitle: panelSpec.title,
            className: panelSpec.className ?? '',
            closable: panelSpec.closable ?? false,
            expandable: panelSpec.expandable ?? false,
          });
        } else {
          return <Panel tabKey={panelSpec.key}
                        className={panelSpec.className ?? ''}
                        tabTitle={panelSpec.title}
                        closable={panelSpec.closable ?? false}
                        expandable={panelSpec.expandable ?? false}>
            {panelSpec.content}
          </Panel>;
        }

      });
  };

  return (<div className="mce-composer">
    <div className="header">
      <ApmLogo height={30} className={'logo'}/>
      <EditableTextField className={'title'} editingClassName={'title editing'} text={title}
                         onConfirm={handleConfirmTitleEdit}/>
      {notificationsDiv}
      <div className={'controls'}>
        <LayoutSplit className={'icon-btn'} title={'Switch to vertical layout'}
                     onClick={() => handleClickDirectionIcon(true)}/>
        <LayoutSplit className={'fa-rotate-90 icon-btn'} title={'Switch to horizontal layout'}
                     onClick={() => handleClickDirectionIcon(false)}/>
        <SaveButton changes={changes}/>
      </div>
    </div>
    <SplitPanels direction={direction} className="panelContainer" dividerClass="divider" dividerWidth={3}
                 outerMargin={10} onResize={handleResize}>
      <TabPanel activeTabKey={activeTabPanelOne}
                onClickTab={(tabKey) => setActiveTabPanelOne(tabKey)}
                onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelsFromSpecs(panelSpecs, 'one')}
      </TabPanel>
      <TabPanel activeTabKey={activeTabPanelTwo}
                onClickTab={(tabKey) => setActiveTabPanelTwo(tabKey)}
                onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelsFromSpecs(panelSpecs, 'two')}
      </TabPanel>
    </SplitPanels>
  </div>);
}