import {useParams} from "react-router";
import {cloneElement, JSX, useContext, useEffect, useRef, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import {
  Arrow90degLeft,
  Arrow90degRight,
  ArrowCounterclockwise,
  ArrowsAngleContract,
  ChevronRight,
  Gear
} from "react-bootstrap-icons";
import {Form, OverlayTrigger, Popover} from "react-bootstrap";
import {MceData} from '@/MceData/MceData';
import {AppContext} from "@/ReactAPM/App";
import ChunksPanel from "@/ReactAPM/Pages/MceComposer/ChunksPanel";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import {ChunkInMceData, MceDataInterface} from "@/MceData/MceDataInterface";
import {deepCopy} from "@/toolbox/Util";
import SaveButton from "@/ReactAPM/Pages/MceComposer/SaveButton";
import {ActionHistory} from "@/ReactAPM/ToolBox/ActionHistory/ActionHistory";
import {ChangeTitleAction} from "@/ReactAPM/Pages/MceComposer/Actions/ChangeTitleAction";
import {DeleteChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/DeleteChunkAction";
import {MoveChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/MoveChunkAction";
import {SetChunkBreakAction} from "@/ReactAPM/Pages/MceComposer/Actions/SetChunkBreakAction";
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";
import WitnessesPanel from "@/ReactAPM/Pages/MceComposer/WitnessesPanel";
import ProgressBar from "@/ReactAPM/Components/ProgressBar/ProgressBar";
import {Edition} from "@/Edition/Edition";
import {MceDataEditionGenerator} from "@/MceData/MceDataEditionGenerator";
import {BasicProfiler} from "@/toolbox/BasicProfiler";
import MainTextPanel from "@/ReactAPM/Pages/MceComposer/MainTextPanel";
import ApmLogo from "@/ReactAPM/Components/ApmLogo/ApmLogo";
import {StatusPage} from "@/ReactAPM/Pages/MceComposer/StatusPage";
import HistoryPanel from "@/ReactAPM/Pages/MceComposer/HistoryPanel";
import MultiToggle from "@/ReactAPM/Components/MultiToggle/MultiToggle";
import './MceComposer.css';

// TODO 2026-07-10
//  - Implement bug notification when actions throw errors
//  - Implement add chunk action and quick add button in "Add Chunk" panel
//  - Design data slices for components, do not pass mceData around


export type CtDataState = 'notLoaded' | 'loading' | 'loaded' | 'error';

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

interface MceSettings {
  autoRegenerate: boolean;
  layoutOrientation: 'horizontal' | 'vertical';
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

  const hashString = (value: string): string => {
    // FNV-1a 32-bit hash (fast, deterministic, browser-safe)
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  };

  const [mceComposerStatus, setMceComposerStatus] = useState<MceComposerStatus>('loadingMce');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ctDataStatusArray, setCtDataStatusArray] = useState<CtDataStatus[]>([]);
  const [lastSavedMceData, setLastSavedMceData] = useState<MceDataInterface | null>(null);
  const [mceData, setMceData] = useState<MceDataInterface>(MceData.createEmpty());
  const [edition, setEdition] = useState<Edition | null>(null);

  const [editionGenerationProgress, setEditionGenerationProgress] = useState<number | null>(null);
  const [settings, setSettings] = useState<MceSettings>({
    autoRegenerate: true,
    layoutOrientation: 'vertical'
  });
  const [activeTabPanelOne, setActiveTabPanelOne] = useState('chunks');
  const [activeTabPanelTwo, setActiveTabPanelTwo] = useState('mainText');
  const [changes, setChanges] = useState<string[]>([]);
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const [history] = useState(() => new ActionHistory());
  const [historyVersion, setHistoryVersion] = useState(0);

  const [editionOutOfDate, setEditionOutOfDate] = useState<boolean>(true);


  const singleChunkEditionCache = useRef<Record<string, Edition>>({});
  /**
   * Cache of generated editions, indexed by data's hash
   */
  const editionCache = useRef<Record<string, Edition>>({});
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
            MceData.fix(resp.mceData);
            setLastSavedMceData(deepCopy(resp.mceData));
            setMceData(resp.mceData);
            history.clear();
            history.markAsSaved();
            setHistoryVersion(v => v + 1);
            setCtDataStatusArray(resp.mceData.chunks.map((chunk) => (
              {
                ctDataId: chunk.chunkEditionTableId,
                chunkInMceData: chunk,
                apiData: null,
                ctDataState: 'notLoaded' as CtDataState,
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
        const firstCtDataNotLoaded = ctDataStatusArray.find((ctDataStatus) => ctDataStatus.ctDataState === 'notLoaded');
        if (!firstCtDataNotLoaded) {
          if (ctDataStatusArray.every((ctDataStatus) => ctDataStatus.ctDataState === 'loaded')) {
            setMceComposerStatus('loaded');
          } else {
            if (ctDataStatusArray.some((ctDataStatus) => ctDataStatus.ctDataState === 'error')) {
              setMceComposerStatus('error');
              setErrorMsg(`Error loading chunks`);
            }
          }
          break;
        }
        const ctDataId = firstCtDataNotLoaded.ctDataId;
        const ctDataStatusIndex = ctDataStatusArray.findIndex((ctDataStatus) => ctDataStatus.ctDataId === ctDataId);
        console.log(`Loading CtData for chunk ${ctDataStatusIndex}, table ${ctDataId}`);
        const ctDataStatus = ctDataStatusArray[ctDataStatusIndex];
        ctDataStatus.ctDataState = 'loading';
        appContext.apiClient.getSingleChunkData(ctDataId, ctDataStatus.chunkInMceData.version).then((apiResponse) => {
          // console.log(`Got data for chunk ${ctDataStatusIndex}, table ${ctDataId}`, apiResponse);
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

  const getMceDataHash = (mceData: MceDataInterface, mceDataId: number) => {
    return hashString(JSON.stringify([mceData, mceDataId]));
  };
  const isEditionInCache = (mceData: MceDataInterface, mceDataId: number) => {
    return editionCache.current[getMceDataHash(mceData, mceDataId)] !== undefined;
  };

  const getEdition = async (mceData: MceDataInterface, mceDataId: number) => {

    const mceDataHash = getMceDataHash(mceData, mceDataId);
    console.log(`getEdition ${mceDataHash}: mceData ${mceDataId}, ${mceData.chunks.length} chunks`);
    if (editionCache.current[mceDataHash] !== undefined) {
      console.log(`getEdition ${mceDataHash}: cache hit`);
      setEditionGenerationProgress(null);
      return editionCache.current[mceDataHash];
    }
    const profiler = new BasicProfiler('RegenerateEdition', true);
    const singleChunkEditionCacheKey = (chunkIndex: number) => {
      const chunkInfo = mceData.chunks[chunkIndex];
      return `${chunkInfo.chunkId}:${chunkInfo.chunkEditionTableId}:${chunkInfo.version}`;
    };

    const generator = new MceDataEditionGenerator({
      ctDataGetter: async (mceData: MceDataInterface, chunkIndex: number) => {
        const chunk = mceData.chunks[chunkIndex];
        const data = await appContext.apiClient.getSingleChunkData(chunk.chunkEditionTableId, chunk.version, true);
        return data.ctData;
      },
      singleChunkEditionGetter: async (_mceData: MceDataInterface, chunkIndex: number) => {
        return singleChunkEditionCache.current[singleChunkEditionCacheKey(chunkIndex)] ?? null;
      },
      singleChunkEditionSaver: async (_mceData: MceDataInterface, chunkIndex: number, edition) => {
        singleChunkEditionCache.current[singleChunkEditionCacheKey(chunkIndex)] = new Edition().setFromInterface(edition);
      },
      onProgressUpdate: (step, numSteps) => {
        setEditionGenerationProgress(step / numSteps);
      }
    });
    const generatedEdition = new Edition().setFromInterface(await generator.generate(mceData, mceDataId));
    profiler.stop();
    setEditionGenerationProgress(null);
    console.log(`getEdition ${mceDataHash}: edition generated`);
    editionCache.current[mceDataHash] = generatedEdition;
    return generatedEdition;
  };

  /**
   * Initial edition generation
   */
  useEffect(() => {
    if (mceComposerStatus !== 'loaded') {
      return;
    }
    if (edition !== null) {
      return;
    }
    console.log(`Initial edition generation: mceData ${mceDataId}, ${mceData.chunks.length} chunks, hash ${getMceDataHash(mceData, mceDataId)}`, mceData);
    getEdition(mceData, mceDataId).then((generatedEdition) => {
      setEdition(generatedEdition);
      setEditionOutOfDate(false);
    });
  }, [mceComposerStatus, edition]);


  const checkForChanges = () => {
    setChanges(history.getUnsavedActionLabels());
  };

  /**
   * Things to do when historyVersion changes
   */
  useEffect(() => {
    if (mceComposerStatus !== 'loaded') {
      return;
    }
    checkForChanges();
    if (!isEditionInCache(mceData, mceDataId)) {
      console.log(`History change ${historyVersion} → ${history.getVersion()}: edition ${mceDataId} (hash ${getMceDataHash(mceData, mceDataId)}) not in cache`, mceData);
      setEditionOutOfDate(true);
      if (settings.autoRegenerate) {
        regenerateEdition();
      }
    } else {
      getEdition(mceData, mceDataId).then((generatedEdition) => {
        setEdition(generatedEdition);
        setEditionOutOfDate(false);
      });
    }
  }, [historyVersion, settings.autoRegenerate]);

  useEffect(() => {
    document.title = `MCE: ${mceData.title}`;
  }, [mceData]);

  const deleteChunk = (chunkIndex: number): boolean => {
    console.log("deleteChunk", chunkIndex);
    const result = history.execute(new DeleteChunkAction({mceData, ctDataStatusArray}, chunkIndex, (newData) => {
      setMceData(newData.mceData);
      setCtDataStatusArray(newData.ctDataStatusArray);
      setHistoryVersion(v => v + 1);
    }));
    if (!result.success) {
      console.error('DeleteChunkAction failed', result.errors);
    }
    return result.success;
  };

  const moveChunk = (chunkIndex: number, direction: 'up' | 'down') => {
    console.log(`Move chunk index ${chunkIndex} '${direction}'`);
    const result = history.execute(new MoveChunkAction(mceData, chunkIndex, direction === 'up' ? 'backwards' : 'forwards', (newData) => {
      setMceData(newData);
      setHistoryVersion(v => v + 1);
    }));
    if (!result.success) {
      console.error('MoveChunkAction failed', result.errors);
    }
  };

  const setChunkBreak = (chunkIndex: number, newBreak: string) => {
    console.log(`Set chunk break index ${chunkIndex} '${newBreak}'`);
    const result = history.execute(new SetChunkBreakAction(mceData, chunkIndex, newBreak, (newData) => {
      setMceData(newData);
      setHistoryVersion(v => v + 1);
    }));
    if (!result.success) {
      console.error('SetChunkBreakAction failed', result.errors);
    }
  };

  const updateChunk = (chunkIndex: number) => {
    console.log(`Update chunk index ${chunkIndex}`);
    // No action implemented yet for update chunk in history
    checkForChanges();
  };

  const handleConfirmTitleEdit = (newTitle: string) => {
    const sanitizedTitle = newTitle.trim();
    if (sanitizedTitle === mceData.title) return;

    const result = history.execute(new ChangeTitleAction(mceData, sanitizedTitle, (newData) => {
      setMceData(newData);
      setHistoryVersion(v => v + 1);
    }));
    if (!result.success) {
      console.error('ChangeTitleAction failed', result.errors);
    }
  };

  const handleOnClickTabExpand = (tabKey: string) => {
    console.log(`Click on expand tab ${tabKey}`);
    setExpandedTab(tabKey);
  };

  const handleOnClickCollapseTab = () => {
    console.log(`Click on collapse icon`);
    setExpandedTab(null);
  };

  const handleOnClickRevertChanges = () => {
    console.log(`Click on revert changes`);
    history.revertToSaved();
  };

  const regenerateEdition = () => {
    if (editionGenerationProgress !== null) return;
    setEditionGenerationProgress(0);
    setTimeout(() => {
      getEdition(mceData, mceDataId).then((newEdition) => {
        if (newEdition !== null) {
          setEdition(newEdition);
          setEditionGenerationProgress(null);
          setEditionOutOfDate(false);
        }
      });
    }, 0);
  };

  const handleOnClickRegenerate = () => {
    console.log(`Click on regenerate`);
    regenerateEdition();
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
                              return deleteChunk(chunkIndex);
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
      content: <MainTextPanel edition={edition}
                              generationProgress={editionGenerationProgress} editionOutOfDate={editionOutOfDate}
                              onClickRegenerate={handleOnClickRegenerate}/>,
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
    },
    {
      panel: 'two',
      key: 'history',
      title: 'History',
      content: <HistoryPanel history={history} historyVersion={historyVersion} onGoTo={(idx) => {
        history.goTo(idx);
        setHistoryVersion(v => v + 1);
      }}/>,
      tabbable: true,
    },
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

  const editionGenerationProgressBar = editionGenerationProgress === null ? null :
    <ProgressBar currentStep={editionGenerationProgress}
                 width={200}
                 className={'edition-generation-progress-bar'}
                 numSteps={1}
                 getLabel={(s, _ns) => {
                   return `Generating edition... ${Math.round(s * 100)}%`;
                 }}/>;

  let expandedTabSpec: PanelSpec | null = null;

  if (expandedTab !== null) {
    expandedTabSpec = panelSpecs.find(spec => spec.key === expandedTab) ?? null;
  }

  const undoStack = history.getUndoStack();
  const redoStack = history.getRedoStack();
  const undoTitle = undoStack.length > 0 ? `Undo ${undoStack[undoStack.length - 1].label}` : 'Undo';
  const redoTitle = redoStack.length > 0 ? `Redo ${redoStack[0].label}` : 'Redo';

  const settingsPopover = (
    <Popover id="settings-popover" className="settings-popover">
      <Popover.Header as="h3">Editor Settings</Popover.Header>
      <Popover.Body>
        <div className="setting-item">
          <div className="label">Layout Orientation</div>
          <MultiToggle
            options={[
              {key: 'vertical', label: 'Vertical'},
              {key: 'horizontal', label: 'Horizontal'}
            ]}
            selected={settings.layoutOrientation}
            onChange={(key) => setSettings({...settings, layoutOrientation: key as 'horizontal' | 'vertical'})}
          />
        </div>
        <div className="setting-item">
          <Form.Check
            type="switch"
            id="auto-regenerate-switch"
            label="Automatic edition generation"
            checked={settings.autoRegenerate}
            onChange={(e) => setSettings({...settings, autoRegenerate: e.target.checked})}
          />
        </div>
      </Popover.Body>
    </Popover>
  );

  const notificationsDiv = <div className={'notifications'}>
    {mceComposerStatus === 'loadingSingleChunks' && loadingProgress}
    {editionGenerationProgressBar}
  </div>;

  const controlsDiv =  <div className={'controls'}>
    <Arrow90degLeft className={'icon-btn' + (undoStack.length > 0 ? '' : ' disabled')}
                    title={undoTitle}
                    onClick={() => {
                      history.undo();
                      setHistoryVersion(v => v + 1);
                    }}/>
    <Arrow90degRight className={'icon-btn' + (redoStack.length > 0 ? '' : ' disabled')}
                     title={redoTitle}
                     onClick={() => {
                       history.redo();
                       setHistoryVersion(v => v + 1);
                     }}/>

    <SaveButton changes={changes}/>
    {changes.length > 0 && <ArrowCounterclockwise className={'icon-btn highlighted'}
                                                  onClick={() => handleOnClickRevertChanges()}
                                                  title={'Click to revert to last saved version'}/>}
    <OverlayTrigger trigger="click" placement="bottom" overlay={settingsPopover} rootClose>
      <Gear className={'icon-btn'} title={'Settings'}/>
    </OverlayTrigger>
  </div>


  if (expandedTabSpec !== null) {
    return (
      <div className="mce-composer expanded">
        <div className="header">
          <ApmLogo height={30} className={'logo'}/>
          <div className={'expanded-tab-title-area'}>
            <span className={'title'}>{mceData.title}</span>
            <ChevronRight/>
            <span className={'tab-name'}>{expandedTabSpec.title}</span>
            <ArrowsAngleContract className={'icon-btn'} onClick={() => handleOnClickCollapseTab()}/>
          </div>
          {notificationsDiv}
          {controlsDiv}
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
      <EditableTextField className={'title'} editingClassName={'title editing'} text={mceData.title}
                         onConfirm={handleConfirmTitleEdit}/>
      {notificationsDiv}
      {controlsDiv}
    </div>
    <SplitPanels direction={settings.layoutOrientation} className="panelContainer" dividerClass="divider" dividerWidth={3}
                 outerMargin={10}>
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