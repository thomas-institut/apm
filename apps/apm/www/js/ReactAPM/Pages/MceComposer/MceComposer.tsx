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
import {Form, OverlayTrigger, Popover, Spinner} from "react-bootstrap";
import {MceData} from '@/MceData/MceData';
import {AppContext} from "@/ReactAPM/App";
import ChunksPanel from "@/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import {MceDataInterface} from "@/MceData/MceDataInterface";
import {deepCopy} from "@/toolbox/Util";
import MceComposerSaveButton from "@/ReactAPM/Pages/MceComposer/MceComposerSaveButton";
import {StateHistory} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";
import {ChangeTitleAction} from "@/ReactAPM/Pages/MceComposer/Actions/ChangeTitleAction";
import {DeleteChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/DeleteChunkAction";
import {MoveChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/MoveChunkAction";
import {SetChunkBreakAction} from "@/ReactAPM/Pages/MceComposer/Actions/SetChunkBreakAction";
import {AddChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/AddChunkAction";
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";
import WitnessesPanel, {WitnessData} from "@/ReactAPM/Pages/MceComposer/WitnessesPanel/WitnessesPanel";
import ProgressBar from "@/ReactAPM/Components/ProgressBar/ProgressBar";
import {Edition} from "@/Edition/Edition";
import {MceDataEditionGenerator} from "@/MceData/MceDataEditionGenerator";
import {BasicProfiler} from "@/toolbox/BasicProfiler";
import MainTextPanel from "@/ReactAPM/Pages/MceComposer/MainTextPanel/MainTextPanel";
import ApmLogo from "@/ReactAPM/Components/ApmLogo/ApmLogo";
import {StatusPage} from "@/ReactAPM/Pages/MceComposer/StatusPage";
import SessionPanel from "@/ReactAPM/Pages/MceComposer/SessionsPanel/SessionPanel";
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
import PreviewPanel from "@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel";
import {ApiTypesetPdfRequestData} from "@/Api/DataSchema/ApiPdfUrl";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {urlGen} from "@/pages/common/SiteUrlGen";
import AddChunksPanel from "@/ReactAPM/Pages/MceComposer/AddChunksPanel/AddChunksPanel";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {UpdateChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/UpdateChunkAction";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";

// TODO before release (2026-07-24))
//  - Safeguard: buttons/actions should not be functional when loading or saving
//  - Error handling: all actions/buttons should show error messages when failing, no silent fails. This requires
//    testing that simulates server failures. Maybe a mock api client that fails in different ways

// TODO final checks before release
//  - Run an audit with a couple of "smart" LLMs looking for potential bugs, and holes in testing in all code touched
//    by MceComposer.
//  - Try to attain 100% coverage in functionality testing: come up with tests without LLM help first


// TODO: for later
//  - Implement admin panel with versions
//  - Issue #429: implement clone button in admin panel
//  - Issue #430: implement archive button in admin panel
//  - Issue #399: Implement tags panel


export type CtDataState = 'notLoaded' | 'loading' | 'loaded' | 'error';

type MceComposerStatus =
  'start'
  | 'loadingMce'
  | 'loadingSingleChunks'
  | 'loaded'
  | 'error';

export interface CtDataStatus {
  ctDataId: number;
  chunkId: string;
  requestedVersion: string;
  loadedVersionTimeStamp: string | null;
  isLatestVersion: boolean | null;
  ctDataState: CtDataState;
  errorMsg: string;
  lastVersionTimeStamp: string | null;
}

export interface MceComposerHistoryState {
  mceData: MceDataInterface;
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

const CHUNK_FETCH_BATCH_SIZE = 5;

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
  const [history, setHistory] = useState(() => new StateHistory<MceComposerHistoryState>({
    mceData: MceData.createEmpty(),
  }));
  const [historyVersion, setHistoryVersion] = useState(0);
  const [savedStateSignature, setSavedStateSignature] = useState(history.getHistory()[0].signature);
  const [chunksPanelVersion, setChunksPanelVersion] = useState<number>(0);
  const [foundBug, setFoundBug] = useState<boolean>(false);
  const [foundBugDescription, setFoundBugDescription] = useState<string>('');
  const [editionOutOfDate, setEditionOutOfDate] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);



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

  const editionKey = `mce-${mceDataId}`;

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
      appContext.apiClient.apiMceGetData(mceDataId)
        .then((resp) => {
          if (ignore) {
            return; // avoid problems with React strict mode
          }
          MceData.fix(resp.mceData);

          const initialCtDataStatusArray = resp.mceData.chunks.map((chunk): CtDataStatus => ({
            ctDataId: chunk.chunkEditionTableId,
            chunkId: chunk.chunkId,
            requestedVersion: chunk.version,
            loadedVersionTimeStamp: null,
            isLatestVersion: null,
            ctDataState: 'notLoaded' as CtDataState,
            errorMsg: '',
            lastVersionTimeStamp: null,
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
    // Check if we are fully done
    const allLoaded = ctDataStatusArray.every(st => st.ctDataState === 'loaded');
    const hasErrors = ctDataStatusArray.some(st => st.ctDataState === 'error');

    if (allLoaded || ctDataStatusArray.length === 0) {
      // console.log('All chunks loaded', ctDataStatusArray);
      const initialHistory = new StateHistory<MceComposerHistoryState>(deepCopy({mceData}));
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

    if (ctDataStatusArray.some(st => st.ctDataState === 'loading')) {
      return;
    }

    const chunkIndexesToLoad = ctDataStatusArray
      .map((status, index) => {
        return status.ctDataState === 'notLoaded' ? index : -1;
      })
      .filter((index) => index !== -1)
      .slice(0, CHUNK_FETCH_BATCH_SIZE);

    if (chunkIndexesToLoad.length === 0) {
      return;
    }

    const chunksToLoad = chunkIndexesToLoad.map((chunkIndex) => ctDataStatusArray[chunkIndex]);

    // Instantly mark the selected batch as 'loading' in local state so the next render cycle knows not to
    // double-trigger it.
    setCtDataStatusArray(prev => {
      const next = [...prev];
      chunkIndexesToLoad.forEach((chunkIndex) => {
        next[chunkIndex] = {...next[chunkIndex], ctDataState: 'loading'};
      });
      return next;
    });

    Promise.all(chunksToLoad.map(async (chunkToLoad) => {
      try {
        console.log(`Fetching chunk ${chunkToLoad.ctDataId}`);
        const apiResponse = await appContext.apiClient.getSingleChunkData(chunkToLoad.ctDataId, chunkToLoad.requestedVersion);
        let lastVersionTimeStamp = apiResponse.timeStamp;
        if (!apiResponse.isLatestVersion) {
          console.log(`Chunk ${chunkToLoad.ctDataId} is not the latest version`);
          const latestData = await appContext.apiClient.getSingleChunkData(chunkToLoad.ctDataId, '');
          lastVersionTimeStamp = latestData.timeStamp;
        }

        return {
          ctDataId: chunkToLoad.ctDataId,
          loadedVersionTimeStamp: apiResponse.timeStamp,
          isLatestVersion: apiResponse.isLatestVersion,
          lastVersionTimeStamp,
          errorMsg: null,
        };
      } catch (error) {
        return {
          ctDataId: chunkToLoad.ctDataId,
          loadedVersionTimeStamp: null,
          isLatestVersion: null,
          lastVersionTimeStamp: null,
          errorMsg: error instanceof Error ? error.message : `${error}`,
        };
      }
    }))
      .then((results) => {
        setCtDataStatusArray(prev => {
          const next = [...prev];
          results.forEach((result) => {
            const index = next.findIndex(st => st.ctDataId === result.ctDataId);
            if (index === -1) {
              return;
            }
            if (result.errorMsg !== null) {
              next[index] = {
                ...next[index],
                ctDataState: 'error',
                errorMsg: result.errorMsg,
              };
            } else {
              next[index] = {
                ...next[index],
                ctDataState: 'loaded',
                loadedVersionTimeStamp: result.loadedVersionTimeStamp,
                isLatestVersion: result.isLatestVersion,
                lastVersionTimeStamp: result.lastVersionTimeStamp,
                errorMsg: '',
              };
            }
          });
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
      const margFoliationArray = mceData.includeInAutoMarginalFoliation ?? [];
      const marginalKey = margFoliationArray.length === 0 ? 'no_marginals' : margFoliationArray.join('');

      return `${chunkInfo.chunkId}:${chunkInfo.chunkEditionTableId}:${chunkInfo.version}:${marginalKey}`;
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
  }, [historyVersion]);

  /**
   * Things to do when mceData changes
   */
  useEffect(() => {
    if (mceComposerStatus !== 'loaded') {
      return;
    }
    console.log(`mceData change effect: ${mceDataId}, mceData hash ${getMceDataHash(mceData, mceDataId)}`);
    if (!isEditionInCache(mceData, mceDataId)) {
      console.log(`mceData change: edition hash ${getMceDataHash(mceData, mceDataId)} not in cache`, mceData);
      setEditionOutOfDate(true);
      if (settings.autoRegenerate && mceData.chunks.length > 0) {
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

  const deleteChunk = async (chunkIndex: number): Promise<boolean> => {
    console.log("deleteChunk", chunkIndex);
    try {
      await history.do(new DeleteChunkAction(chunkIndex));
    } catch (error) {
      reportActionBug('DeleteChunkAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const getDocTitle = async (docId: number): Promise<string> => {
    return appContext.apiClient.getEntityName(docId);
  };
  const getSourceTitle = async (sourceId: number): Promise<string> => {
    return appContext.apiClient.getEntityName(sourceId);
  };

  const upsertCtDataStatus = (ctDataStatus: CtDataStatus) => {
    setCtDataStatusArray(prev => {
      const index = prev.findIndex(status => status.ctDataId === ctDataStatus.ctDataId);
      if (index === -1) {
        return [...prev, ctDataStatus];
      }
      const next = [...prev];
      next[index] = ctDataStatus;
      return next;
    });
  };

  const addChunk = async (tableId: number, version: string = ''): Promise<true | string> => {
    console.log(`Add chunk from table ${tableId}, version '${version}'`);
    let chunkApiData: SingleChunkApiData;
    try {
      chunkApiData = await appContext.apiClient.getSingleChunkData(tableId, version);
      if (chunkApiData.ctData.lang !== mceData.lang) {
        return `Table ${tableId} is in ${ApmFormats.getLangName(chunkApiData.ctData.lang)}, only ${ApmFormats.getLangName(mceData.lang)} tables are allowed`;
      }
    } catch (error) {
      const errorString = error as String;
      return errorString.toString();
    }

    try {
      await history.do(new AddChunkAction(
        tableId,
        chunkApiData,
        getDocTitle,
        getSourceTitle,
      ));
    } catch (error) {
      reportActionBug('AddChunkAction', error);
      return 'Bug found';
    }

    upsertCtDataStatus({
      ctDataId: tableId,
      chunkId: chunkApiData.ctData.chunkId,
      requestedVersion: chunkApiData.timeStamp,
      loadedVersionTimeStamp: chunkApiData.timeStamp,
      isLatestVersion: chunkApiData.isLatestVersion,
      ctDataState: 'loaded',
      errorMsg: '',
      lastVersionTimeStamp: null,
    });

    setHistoryVersion(v => v + 1);
    setChunksPanelVersion(v => v + 1);
    return true;
  };

  const moveChunk = async (chunkPosition: number, direction: 'up' | 'down'): Promise<boolean> => {
    console.log(`Move chunk at position ${chunkPosition} '${direction}'`);
    try {
      await history.do(new MoveChunkAction(chunkPosition, direction === 'up' ? 'backwards' : 'forwards'));
    } catch (error) {
      reportActionBug('MoveChunkAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const setChunkBreak = async (chunkPosition: number, newBreak: string): Promise<boolean> => {
    console.log(`Set break for chunk at position ${chunkPosition} to '${newBreak}'`);
    try {
      await history.do(new SetChunkBreakAction(chunkPosition, newBreak));
    } catch (error) {
      reportActionBug('SetChunkBreakAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    setChunksPanelVersion(v => v + 1);
    return true;
  };

  const updateChunk = async (chunkIndex: number): Promise<true | string> => {
    console.log(`Update chunk index ${chunkIndex}`);
    const tableId = mceData.chunks[chunkIndex].chunkEditionTableId;
    let chunkApiData: SingleChunkApiData;
    try {
      chunkApiData = await appContext.apiClient.getSingleChunkData(tableId, '');
      if (chunkApiData.ctData.lang !== mceData.lang) {
        return `Table ${tableId} is in ${ApmFormats.getLangName(chunkApiData.ctData.lang)}, only ${ApmFormats.getLangName(mceData.lang)} tables are allowed`;
      }
    } catch (error) {
      const errorString = error as String;
      return errorString.toString();
    }
    try {
      await history.do(new UpdateChunkAction(tableId,
        chunkApiData,
        getDocTitle,
        getSourceTitle,));
    } catch (error) {
      reportActionBug('UpdateChunkAction', error);
      return 'Bug found';
    }

    upsertCtDataStatus({
      ctDataId: tableId,
      chunkId: chunkApiData.ctData.chunkId,
      requestedVersion: chunkApiData.timeStamp,
      loadedVersionTimeStamp: chunkApiData.timeStamp,
      isLatestVersion: chunkApiData.isLatestVersion,
      ctDataState: 'loaded',
      errorMsg: '',
      lastVersionTimeStamp: chunkApiData.timeStamp,
    });

    setHistoryVersion(v => v + 1);
    setChunksPanelVersion(v => v + 1);
    return true;
  };

  const handleSetSiglum = async (witnessIndex: number, newSiglum: string) => {
    try {
      await history.do(new SetSiglumAction(witnessIndex, newSiglum));
    } catch (error) {
      reportActionBug('SetSiglumAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const handleSetIncludeInAutoMarginalFoliation = async (witnessIndex: number, newState: boolean) => {
    try {
      await history.do(new SetIncludeInAutoMarginalFoliationAction(witnessIndex, newState));
    } catch (error) {
      reportActionBug('SetIncludeInAutoMarginalFoliationAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const handleDeleteSiglaGroup = async (siglaGroupIndex: number) => {
    try {
      await history.do(new DeleteSiglaGroupAction(siglaGroupIndex));
    } catch (error) {
      reportActionBug('DeleteSiglaGroupAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const handleChangeSiglaGroup = async (siglaGroupIndex: number, newGroup: SiglaGroupInterface) => {
    try {
      await history.do(new ChangeSiglaGroupAction(siglaGroupIndex, newGroup));
    } catch (error) {
      reportActionBug('ChangeSiglaGroupAction', error);
      return false;
    }
    setHistoryVersion(v => v + 1);
    return true;
  };

  const handleConfirmTitleEdit = async (newTitle: string) => {
    const sanitizedTitle = newTitle.trim();
    if (sanitizedTitle === mceData.title) return;

    try {
      await history.do(new ChangeTitleAction(sanitizedTitle));
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

  const getPdfUrl = async (data: ApiTypesetPdfRequestData) => {
    const apiResponse = await appContext.apiClient.getPdfDownloadUrl(data);
    if (apiResponse.url !== null) {
      return apiResponse.url;
    }
    throw apiResponse.errorMsg;
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

  const checkForChunkUpdates = async () => {
    const updatePromises = ctDataStatusArray.map(async (ctDataStatus) => {
      if (ctDataStatus.ctDataState !== 'loaded') {
        return ctDataStatus;
      }
      if (ctDataStatus.loadedVersionTimeStamp === null) {
        return ctDataStatus;
      }
      const tableId = ctDataStatus.ctDataId;
      console.log(`Checking for chunk updates for table ${tableId}`);
      const latestVersionInfo = await appContext.apiClient.collationTableVersionInfo(tableId, 'latest');
      if (latestVersionInfo !== null) {
        const isLatestVersion = ctDataStatus.loadedVersionTimeStamp === latestVersionInfo.timeFrom;
        if (!isLatestVersion) {
          console.log(`Table ${tableId} has a newer version: ${latestVersionInfo.timeFrom}`);
        }
        return {
          ...ctDataStatus,
          lastVersionTimeStamp: latestVersionInfo.timeFrom,
          isLatestVersion,
        };
      } else {
        console.warn('No latest version info for table', tableId);
      }
      return ctDataStatus;
    });
    setCtDataStatusArray(await Promise.all(updatePromises));
  };


  const isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string = (siglaGroupIndex, group) => {
    return MceData.isSiglaGroupValid(mceData, siglaGroupIndex, group);
  };

  const regenerateEdition = async () => {
    if (editionGenerationProgress !== null) return;
    setEditionGenerationProgress(0);
    await nextTick();
    const newEdition = await getEdition(mceData, mceDataId);
    if (newEdition !== null) {
      setEdition(newEdition);
      setEditionGenerationProgress(null);
      setEditionOutOfDate(false);
    }
  };

  const handleOnClickRegenerate = () => {
    console.log(`Click on regenerate`);
    regenerateEdition();
  };

  const handleOnClickSaveButton = async () => {
    console.log(`Click on save`);
    if (changes.length === 0) {
      console.warn(`Cannot save MCE data because there are no changes`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    await nextTick();
    const response = await appContext.apiClient.apiMceSave({
      editionId: mceDataId,
      mceData,
      description: changes.join('. ')
    });
    if (response.result === 'Error') {
      setSaveError(response.message ?? 'Error saving');
      setSaving(false);
      return;
    }
    console.log(`Saved MCE data`, response);
    if (mceDataId === -1) {
      // TODO: make sure this redirects to the right place!
      window.location.href = urlGen.siteMultiChunkEdition(response.editionId);
    }
    // reset history
    history.reset(history.getCurrentState(), 'Last save');
    setSavedStateSignature(history.getHistory()[0].signature);
    setChanges([]);
    setSaving(false);
  };

  const getDataForWitnessPanel = (): WitnessData[] => {
    return mceData.witnesses.map((w, index) => {
      let title = w.title;
      if (w.localWitnessId !== undefined && w.localWitnessId !== 'A') {
        title = `${title} (${w.localWitnessId})`;
      }
      const includeInAutoMarginalFoliationState = mceData.includeInAutoMarginalFoliation?.includes(index) ?? false;
      return {siglum: mceData.sigla[index], title, includeInAutoMarginalFoliation: includeInAutoMarginalFoliationState};
    });
  };

  const getActiveEditions = async () => {
    // ignoring workId for now
    try {
      const activeEditions = await appContext.apiClient.getActiveEditions();
      const workIds = MceData.getWorkIds(mceData);
      return activeEditions.filter(e => workIds.includes(e.workId));
    } catch (e) {
      const error = e as Error;
      return error.message;
    }
  };


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
                            checkForChunkUpdates={checkForChunkUpdates}
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
      expandable: false,
      className: 'preview-panel',
      content: <PreviewPanel editionKey={editionKey} edition={edition} getPdfUrl={getPdfUrl}/>,
      tabbable: true,
    },
    {
      panel: 'two',
      key: 'addChunks',
      title: 'Add Chunks',
      expandable: true,
      content: <AddChunksPanel addChunk={(tableId, version) => {
        return addChunk(tableId, version);
      }}
                               currentChunkTableIds={mceData.chunks.map(chunk => chunk.chunkEditionTableId) ?? []}
                               getActiveEditions={getActiveEditions}
      />,
      tabbable: true,
    },
    // {
    //   panel: 'two',
    //   key: 'versions',
    //   title: 'Versions',
    //   expandable: true,
    //   content: <>Versions will be here...</>
    // },
    {
      panel: 'two',
      key: 'session',
      title: 'Session',
      content: <SessionPanel history={history}
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
        <p>You have discovered a bug in the software! Please click <a
          href={'https://github.com/thomas-institut/apm/issues/new'} target="_blank">here to report it on Github</a>.
        </p>
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

    {!foundBug && <ComponentWithPending pending={saving} pendingElement={<span>Saving... <Spinner size={'sm'}/></span>}>
      <MceComposerSaveButton changes={changes} onClick={handleOnClickSaveButton} saveError={saveError}/>
    </ComponentWithPending>}
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