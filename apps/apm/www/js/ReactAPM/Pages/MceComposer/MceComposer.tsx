import {useParams} from "react-router";
import {cloneElement, JSX, useContext, useEffect, useRef, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import {
  Arrow90degLeft,
  Arrow90degRight,
  ArrowCounterclockwise,
  ArrowsAngleContract,
  BugFill,
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
import MceComposerSaveButton from "@/ReactAPM/Pages/MceComposer/MceComposerSaveButton";
import {StateHistory} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";
import {ChangeTitleAction} from "@/ReactAPM/Pages/MceComposer/Actions/ChangeTitleAction";
import {DeleteChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/DeleteChunkAction";
import {MoveChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/MoveChunkAction";
import {SetChunkBreakAction} from "@/ReactAPM/Pages/MceComposer/Actions/SetChunkBreakAction";
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";
import WitnessesPanel, {WitnessData} from "@/ReactAPM/Pages/MceComposer/WitnessesPanel";
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
import {hashString} from "@/ReactAPM/ToolBox/Hash";
import {SetSiglumAction} from "@/ReactAPM/Pages/MceComposer/Actions/SetSiglumAction";
import {
  SetIncludeInAutoMarginalFoliationAction
} from "@/ReactAPM/Pages/MceComposer/Actions/SetIncludeInAutoMarginalFoliationAction";
import {SiglaGroupInterface} from "@/CtData/CtDataInterface";
import {ChangeSiglaGroupAction} from "@/ReactAPM/Pages/MceComposer/Actions/ChangeSiglaGroupAction";
import {DeleteSiglaGroupAction} from "@/ReactAPM/Pages/MceComposer/Actions/DeleteSiglaGroupAction";
import PreviewPanel from "@/ReactAPM/Pages/MceComposer/PreviewPanel";

// TODO 2026-07-21
//  - Implement add chunk action and quick add button in "Add Chunk" panel
//  - Implement getPDF in preview panel
//  - Implement versions panel
//  - Implement showing tags in chunks panel


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

export interface HistoryState {
  mceData: MceDataInterface;
  ctDataStatusArray: CtDataStatus[];
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

  const [mceComposerStatus, setMceComposerStatus] = useState<MceComposerStatus>('loadingMce');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ctDataStatusArray, setCtDataStatusArray] = useState<CtDataStatus[]>([]);
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
  const [history, setHistory] = useState(() => new StateHistory<HistoryState>({
    mceData: MceData.createEmpty(),
    ctDataStatusArray: [],
  }));
  const [historyVersion, setHistoryVersion] = useState(0);
  const [savedStateSignature, setSavedStateSignature] = useState(history.getHistory()[0].signature);
  const [chunksPanelVersion, setChunksPanelVersion] = useState<number>(0);
  const [foundBug, setFoundBug] = useState<boolean>(false);
  const [foundBugDescription, setFoundBugDescription] = useState<string>('');

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

  // 1. Hook to load MceData (Phase: start -> loadingMce -> loadingSingleChunks)
  useEffect(() => {
    if (mceComposerStatus === 'start') {
      setMceComposerStatus('loadingMce');
      return;
    }

    if (mceComposerStatus === 'loadingMce') {
      if (mceDataId === -1) {
        // new MCE
        setMceComposerStatus('loadingSingleChunks');
        return;
      }

      let ignore = false;
      appContext.apiClient.getMceData(mceDataId)
        .then((resp) => {
          if (ignore) {
            return; // avoid problems with React strict mode
          }
          MceData.fix(resp.mceData);

          const initialCtDataStatusArray = resp.mceData.chunks.map((chunk) => ({
            ctDataId: chunk.chunkEditionTableId,
            chunkInMceData: chunk,
            apiData: null,
            ctDataState: 'notLoaded' as CtDataState,
            errorMsg: ''
          }));
          setMceData(resp.mceData);
          setCtDataStatusArray(initialCtDataStatusArray);
          setMceComposerStatus('loadingSingleChunks');
        })
        .catch((error) => {
          if (ignore) {
            return; // avoid problems with React strict mode
          }
          setMceComposerStatus('error');
          setErrorMsg(`Failed to load MCE data from server: ${error.message}`);
        });

      return () => {
        ignore = true;
      }; // Resilient to Strict Mode double-firing
    }
  }, [mceComposerStatus, mceDataId]);


// 2. Hook to fetch chunks (Phase: loadingSingleChunks)
  useEffect(() => {
    if (mceComposerStatus !== 'loadingSingleChunks') {
      return;
    }
    if (ctDataStatusArray.length === 0) {
      return;
    }

    // Check if we are fully done
    const allLoaded = ctDataStatusArray.every(st => st.ctDataState === 'loaded');
    const hasErrors = ctDataStatusArray.some(st => st.ctDataState === 'error');

    if (allLoaded) {
      const initialHistory = new StateHistory<HistoryState>(deepCopy({mceData, ctDataStatusArray}));
      setHistory(initialHistory);
      setSavedStateSignature(initialHistory.getCurrentStateSignature());
      setHistoryVersion(v => v + 1);
      setMceComposerStatus('loaded');
      return;
    }

    if (hasErrors) {
      setMceComposerStatus('error');
      setErrorMsg(`Error loading chunks`);
      return;
    }

    // Find the next chunk to load
    const nextChunkIndex = ctDataStatusArray.findIndex(st => st.ctDataState === 'notLoaded');
    if (nextChunkIndex === -1) {
      return; // Currently loading some, waiting for promises to resolve
    }
    const chunkToLoad = ctDataStatusArray[nextChunkIndex];

    // Instantly mark it as 'loading' in local state so the next render cycle knows not to double-trigger it
    setCtDataStatusArray(prev => {
      const next = [...prev];
      next[nextChunkIndex] = {...next[nextChunkIndex], ctDataState: 'loading'};
      return next;
    });

    // Fetch the data
    console.log(`Fetching chunk index ${nextChunkIndex} (${chunkToLoad.ctDataId}) from server`);
    appContext.apiClient.getSingleChunkData(chunkToLoad.ctDataId, chunkToLoad.chunkInMceData.version)
      .then((apiResponse) => {
        setCtDataStatusArray(prev => {
          const next = [...prev];
          const index = next.findIndex(st => st.ctDataId === chunkToLoad.ctDataId);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              apiData: apiResponse,
              ctDataState: 'loaded'
            };
          }
          return next;
        });
      })
      .catch((error) => {
        setCtDataStatusArray(prev => {
          const next = [...prev];
          const index = next.findIndex(st => st.ctDataId === chunkToLoad.ctDataId);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              ctDataState: 'error',
              errorMsg: error.message
            };
          }
          return next;
        });
      });

  }, [mceComposerStatus, ctDataStatusArray, mceData]);

  const getMceDataHash = (mceData: MceDataInterface, mceDataId: number) => {
    return hashString(JSON.stringify([mceData, mceDataId]));
  };
  const isEditionInCache = (mceData: MceDataInterface, mceDataId: number) => {
    return editionCache.current[getMceDataHash(mceData, mceDataId)] !== undefined;
  };

  const getEdition = async (mceData: MceDataInterface, mceDataId: number) => {

    const mceDataHash = getMceDataHash(mceData, mceDataId);
    if (editionCache.current[mceDataHash] !== undefined) {
      console.log(`getEdition ${mceDataHash}: cache hit`);
      setEditionGenerationProgress(null);
      return editionCache.current[mceDataHash];
    }
    console.log(`getEdition ${mceDataHash}: cache miss`);
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


  const checkForChanges = () => {
    // console.log(`Check for changes, savedState ${savedStateSignature}`, history);
    const fullMinimalHistory = history.getMinimalHistory(savedStateSignature, history.getCurrentStateSignature());
    // console.log(`Full minimal history`, fullMinimalHistory);
    const descriptions = fullMinimalHistory.filter(s => s.signature !== savedStateSignature)
      .map((entry) => entry.actionDescription);
    setChanges(descriptions);
  };

  /**
   * Things to do when historyVersion changes
   */
  useEffect(() => {
    if (mceComposerStatus !== 'loaded') {
      return;
    }
    checkForChanges();
    const currentHistoryState = history.getCurrentState();
    setMceData(currentHistoryState.mceData);
    setCtDataStatusArray(currentHistoryState.ctDataStatusArray);
  }, [historyVersion]);

  /**
   * Things to do when mceData changes
   */
  useEffect(() => {
    if (mceComposerStatus !== 'loaded') {
      return;
    }
    if (!isEditionInCache(mceData, mceDataId)) {
      console.log(`mceData change: edition hash ${getMceDataHash(mceData, mceDataId)} not in cache`, mceData);
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
  }, [mceData, mceDataId, settings.autoRegenerate]);

  useEffect(() => {
    document.title = `MCE: ${mceData.title}`;
  }, [mceData]);

  const reportActionBug = (actionName: string, error: unknown) => {
    console.error(`${actionName} failed`, error);
    setFoundBug(true);
    setFoundBugDescription(`${actionName} failed. ${error}`);
  };

  const deleteChunk = (chunkIndex: number): boolean => {
    console.log("deleteChunk", chunkIndex);
    try {
      history.do(new DeleteChunkAction(chunkIndex));
    } catch (error) {
      reportActionBug('DeleteChunkAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const moveChunk = (chunkPosition: number, direction: 'up' | 'down') => {
    console.log(`Move chunk at position ${chunkPosition} '${direction}'`);
    try {
      history.do(new MoveChunkAction(chunkPosition, direction === 'up' ? 'backwards' : 'forwards'));
    } catch (error) {
      reportActionBug('MoveChunkAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const setChunkBreak = (chunkPosition: number, newBreak: string) => {
    console.log(`Set break for chunk at position ${chunkPosition} to '${newBreak}'`);
    try {
      history.do(new SetChunkBreakAction(chunkPosition, newBreak));
    } catch (error) {
      reportActionBug('SetChunkBreakAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    setChunksPanelVersion(v => v + 1);
    return true;
  };

  const updateChunk = (chunkIndex: number) => {
    console.log(`Update chunk index ${chunkIndex}`);

    console.log(`Update chunk not implemented yet`);
    // No action implemented yet for update chunk in history
    setChunksPanelVersion(v => v + 1);
    return true;
  };

  const handleSetSiglum = (witnessIndex: number, newSiglum: string) => {
    try {
      history.do(new SetSiglumAction(witnessIndex, newSiglum));
    } catch (error) {
      reportActionBug('SetSiglumAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  }

  const handleSetIncludeInAutoMarginalFoliation = (witnessIndex: number, newState: boolean) => {
    try {
      history.do(new SetIncludeInAutoMarginalFoliationAction(witnessIndex, newState));
    } catch (error) {
      reportActionBug('SetIncludeInAutoMarginalFoliationAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  }

  const handleDeleteSiglaGroup = (siglaGroupIndex: number) => {
    try {
      history.do(new DeleteSiglaGroupAction(siglaGroupIndex));
    } catch (error) {
      reportActionBug('DeleteSiglaGroupAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  }

  const handleChangeSiglaGroup = (siglaGroupIndex: number, newGroup: SiglaGroupInterface) => {
    try {
      history.do(new ChangeSiglaGroupAction(siglaGroupIndex, newGroup));
    } catch (error) {
      reportActionBug('ChangeSiglaGroupAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  }

  const handleConfirmTitleEdit = (newTitle: string) => {
    const sanitizedTitle = newTitle.trim();
    if (sanitizedTitle === mceData.title) return;

    try {
      history.do(new ChangeTitleAction(sanitizedTitle));
    } catch (error) {
      reportActionBug('ChangeTitleAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
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
    const savedIndex = history.getHistory().findIndex(item => item.signature === savedStateSignature);
    if (savedIndex >= 0) {
      history.goToState(savedIndex);
      setHistoryVersion(v => v + 1);
      setChunksPanelVersion(v => v + 1);
    }
  };


  const isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string = (siglaGroupIndex, group) => {
    return MceData.isSiglaGroupValid(mceData, siglaGroupIndex, group);
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

  const getDataForWitnessPanel = () : WitnessData[] => {
    return mceData.witnesses.map((w, index) => {
      let title = w.title;
      if (w.localWitnessId !== undefined && w.localWitnessId !== 'A') {
        title = `${title} (${w.localWitnessId})`;
      }
      const includeInAutoMarginalFoliationState = mceData.includeInAutoMarginalFoliation?.includes(index) ?? false;
      return {siglum: mceData.sigla[index], title, includeInAutoMarginalFoliation: includeInAutoMarginalFoliationState};
    });
  }


  const panelSpecs: PanelSpec[] = [
    {
      panel: 'one',
      key: 'chunks',
      title: 'Chunks',
      expandable: true,
      content: <ChunksPanel chunks={mceData.chunks}
                            version={chunksPanelVersion}
                            chunkOrder={mceData.chunkOrder ?? MceData.getDefaultChunkOrder(mceData)}
                            ctDataStatusArray={ctDataStatusArray}
                            moveChunk={(chunkIndex, direction) => {
                              return moveChunk(chunkIndex, direction);
                            }}
                            updateChunk={(chunkIndex) => {
                              return updateChunk(chunkIndex);
                            }}
                            deleteChunk={(chunkIndex) => {
                              return deleteChunk(chunkIndex);
                            }}
                            setChunkBreak={(chunkIndex, breakAfter) => {
                              return setChunkBreak(chunkIndex, breakAfter);
                            }}
      />,
      tabbable: true,
    },
    {
      panel: 'one',
      key: 'witnesses',
      title: 'Witnesses',
      content: <WitnessesPanel witnesses={getDataForWitnessPanel()}
                               siglaGroups={mceData.siglaGroups}
                               onChangeSiglum={handleSetSiglum}
                               isSiglaGroupValid={isSiglaGroupValid}
                               onDeleteSiglaGroup={handleDeleteSiglaGroup}
                               onChangeSiglaGroup={handleChangeSiglaGroup}
                               onChangeIncludeInAutoMarginalFoliation={handleSetIncludeInAutoMarginalFoliation}/>,
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
      content: <PreviewPanel edition={edition}/>,
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
      content: <>Versions will be here...</>
    },
    {
      panel: 'two',
      key: 'history',
      title: 'History',
      content: <HistoryPanel history={history}
                             savedStateSignature={savedStateSignature}
                             historyVersion={historyVersion}
                             onGoTo={(idx) => {
                               history.goToState(idx);
                               setHistoryVersion(v => v + 1);
                             }}
                             onClearHistory={() => {
                               const savedIndex = history.getHistory().findIndex(item => item.signature === savedStateSignature);
                               if (savedIndex >= 0) {
                                 history.clear(savedIndex);
                                 setHistoryVersion(v => v + 1);
                               }
                             }}
      />,
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

  const historyItems = history.getHistory();
  const currentStateIndex = history.getCurrentStateIndex();
  const canUndo = currentStateIndex > 0;
  const canRedo = currentStateIndex < historyItems.length - 1;
  const undoTitle = canUndo ? `Undo ${historyItems[currentStateIndex].actionDescription}` : 'Undo';
  const redoTitle = canRedo ? `Redo ${historyItems[currentStateIndex + 1].actionDescription}` : 'Redo';

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

  const bugPopover = (
    <Popover id="bug-popover" className="bug-popover">
      <Popover.Header>Oops!</Popover.Header>
      <Popover.Body>
        <p>You have discovered a bug in the software! Please click <a href={'https://github.com/thomas-institut/apm/issues/new'} target="_blank">here to report it on Github</a>.</p>
        <p>Include the following description:</p>
        <p className={'bug-description'}>{foundBugDescription}</p>
        <p>Be sure to include the following information as well:</p>
        <ul>
          <li>What you were doing when the bug occurred.</li>
          <li>A screenshot of the History Panel</li>
          <li>If possible, error messages or logs from the Developer Tools</li>
        </ul>
      </Popover.Body>
    </Popover>
  );

  const controlsDiv = <div className={'controls'}>
    {!foundBug && <Arrow90degLeft className={'icon-btn' + (canUndo ? '' : ' disabled')}
                                  title={undoTitle}
                                  onClick={() => {
                                    history.undo();
                                    setHistoryVersion(v => v + 1);
                                    setChunksPanelVersion(v => v + 1);
                                  }}/>}
    {!foundBug && <Arrow90degRight className={'icon-btn' + (canRedo ? '' : ' disabled')}
                                   title={redoTitle}
                                   onClick={() => {
                                     history.redo();
                                     setHistoryVersion(v => v + 1);
                                     setChunksPanelVersion(v => v + 1);
                                   }}/>}

    {!foundBug && <MceComposerSaveButton changes={changes}/>}
    {!foundBug && <ArrowCounterclockwise className={'icon-btn' + (changes.length > 0 ? ' highlighted' : ' disabled')}
                                         onClick={() => handleOnClickRevertChanges()}
                                         title={'Click to revert to last saved version'}/>}
    {foundBug && <OverlayTrigger trigger={['click']} placement="bottom" overlay={bugPopover}>
      <BugFill className={'icon-btn bug-icon'} title={`A bug was found, click here for more information`}/>
    </OverlayTrigger>}
    <OverlayTrigger trigger="click" placement="bottom" overlay={settingsPopover} rootClose>
      <Gear className={'icon-btn'} title={'Settings'}/>
    </OverlayTrigger>
  </div>;


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
    <SplitPanels direction={settings.layoutOrientation} className="panelContainer" dividerClass="divider"
                 dividerWidth={3}
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