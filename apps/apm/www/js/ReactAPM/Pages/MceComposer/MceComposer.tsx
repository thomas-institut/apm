import {useParams, useNavigate} from "react-router";
import {cloneElement, JSX, useContext, useEffect, useMemo, useRef, useState} from "react";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import {
  Arrow90degLeft,
  Arrow90degRight,
  ArrowCounterclockwise,
  ArrowsAngleContract,
  ChevronRight, Gear
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
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import AddChunksPanel from "@/ReactAPM/Pages/MceComposer/AddChunksPanel/AddChunksPanel";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {UpdateChunkAction} from "@/ReactAPM/Pages/MceComposer/Actions/UpdateChunkAction";
import {AddStandardizedStringAction} from "@/ReactAPM/Pages/MceComposer/Actions/AddStandardizedStringAction";
import {DeleteStandardizedStringAction} from "@/ReactAPM/Pages/MceComposer/Actions/DeleteStandardizedStringAction";
import {SetStandardizedStringInstanceStatusAction} from "@/ReactAPM/Pages/MceComposer/Actions/SetStandardizedStringInstanceStatusAction";
import {ResetStandardizedStringAllAction} from "@/ReactAPM/Pages/MceComposer/Actions/ResetStandardizedStringAllAction";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";
import {parseValidNumericalId} from "@/ReactAPM/ToolBox/ParseValidNumericalId";
import {OperationalError} from "@/lib/Error/SystemError";
import {ApmApiClientError} from "@/Api/ApmApiClient";
import StandardizationPanel from "@/ReactAPM/Pages/MceComposer/StandardizationPanel/StandardizationPanel";
import {StandardizedWords} from "@/ReactAPM/Pages/MceComposer/StandardizedWords";
import {StandardizedStringInstanceStatus} from "@/MceData/StandardizedString";
import AdminPanel from "@/ReactAPM/Pages/MceComposer/AdminPanel/AdminPanel";
import {MceVersionInfo} from "@/Api/DataSchema/ApiMceData";
import {TimeString} from "@/toolbox/TimeString";
import BugWarningButton from "@/ReactAPM/Pages/MceComposer/BugWarningButton";
import NotLastVersionWarningButton from "@/ReactAPM/Pages/MceComposer/NotLastVersionWarningButton";

// TODO: for later
//  - Implement admin panel with versions
//  - Issue #429: implement clone button in admin panel
//  - Issue #430: implement archive button in admin panel
//  - Issue #399: Implement tags panel


export type CtDataState = 'notLoaded' | 'loading' | 'loaded' | 'error';

export type MceComposerStatus =
  'start'
  | 'loadingMce'
  | 'loadingSingleChunks'
  | 'loaded'
  | 'error';

export const isMceDataEditingAllowed = (mceComposerStatus: MceComposerStatus): boolean => {
  return mceComposerStatus === 'loaded';
};

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

interface ChunkLoadResult {
  ctDataId: number;
  loadedVersionTimeStamp: string | null;
  isLatestVersion: boolean | null;
  lastVersionTimeStamp: string | null;
  errorMsg: string | null;
}

export interface MceComposerHistoryState {
  mceData: MceDataInterface;
}

interface InitialMceData {
  mceData: MceDataInterface;
  versions: MceVersionInfo[];
  isLastVersion: boolean;
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

interface PendingEditionGenerationRequest {
  signature: string;
  mceData: MceDataInterface;
  mceDataId: number;
}


const CHUNK_FETCH_BATCH_SIZE = 5;
const MCE_DATA_NOT_LOADED_ERROR = 'Cannot modify MCE data until it is loaded';
const SAVING_EDIT_ERROR = 'Cannot modify MCE data while saving';
const EDIT_IN_PROGRESS_ERROR = 'Cannot modify MCE data while another edit is in progress';
const OPERATIONAL_ACTION_ERROR_TIMEOUT_MS = 5000;

const getMessageFromThrownError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error ?? 'Unknown error');
};

export default function MceComposer() {

  const [mceComposerStatus, setMceComposerStatus] = useState<MceComposerStatus>('loadingMce');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ctDataStatusArray, setCtDataStatusArray] = useState<CtDataStatus[]>([]);
  const [mceData, setMceData] = useState<MceDataInterface>(MceData.createEmpty());
  const [versions, setVersions] = useState<MceVersionInfo[]>([]);
  const [isLastVersion, setIsLastVersion] = useState<boolean|null>(null);
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
  const [operationalActionErrorMsg, setOperationalActionErrorMsg] = useState<string | null>(null);
  const [editionOutOfDate, setEditionOutOfDate] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastFullChunkLoadTime, setLastFullChunkLoadTime] = useState<Date | null>(null);


  const singleChunkEditionCache = useRef<Record<string, Edition>>({});
  const savingRef = useRef(false);
  const mceDataEditInProgressRef = useRef(false);
  const editionGenerationInProgressRef = useRef(false);
  const pendingEditionGenerationRequestRef = useRef<PendingEditionGenerationRequest | null>(null);
  const latestMceDataRef = useRef<MceDataInterface>(mceData);
  const latestMceDataIdRef = useRef<number>(-1);
  const latestAutoRegenerateRef = useRef<boolean>(settings.autoRegenerate);
  const editorSessionRef = useRef(0);
  const inFlightChunkLoadRequestsRef = useRef<Record<string, Promise<ChunkLoadResult>>>({});
  const chunkLoadBatchRequestRef = useRef(0);
  const operationalActionErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Cache of generated editions, indexed by data's hash
   */
  const editionCache = useRef<Record<string, Edition>>({});
  const shimWidth = 5;

  const {id, version} = useParams();
  const navigate = useNavigate();
  const appContext = useContext(AppContext);
  let mceDataId = -1;
  let versionString: string | null = null;
  let routeErrorMsg: string | null = null;

  if (id === undefined) {
    routeErrorMsg = 'MCE ID is undefined';
  } else {
    if (id !== 'new') {
      const parsedMceDataId = parseValidNumericalId(id);
      if (parsedMceDataId === null) {
        console.warn(`Invalid MCE ID: ${id}`);
        routeErrorMsg = 'Invalid MCE ID';
      } else {
        mceDataId = parsedMceDataId;
        if (version !== undefined) {
          versionString = TimeString.compactDecode(version);
        }
      }
    } else {
      if (version !== undefined) {
        routeErrorMsg = 'New MCEs must not have a version';
      }
    }
  }

  const editionKey = `mce-${mceDataId}` + (versionString !== null ? `-${versionString}` : '');
  const isMceDataIdValid = routeErrorMsg === null && (id === 'new' || mceDataId > 0);


  const getInitialInfo = async (mceDataId: number, versionString: string | undefined): Promise<InitialMceData> => {
    const respGet = await appContext.apiClient.apiMceGetData(mceDataId, versionString);
    const respVersions = await appContext.apiClient.apiMceGetVersions(mceDataId);
    const sortedVersions = respVersions.versions.sort((a, b) => b.timeString.localeCompare(a.timeString));

    return {
      mceData: respGet.mceData,
      versions: sortedVersions,
      isLastVersion: respGet.validFrom === sortedVersions[0].timeString,
    };
  }

  // Start a fresh editor session whenever the route selects another MCE.
  useEffect(() => {
    if (!isMceDataIdValid) {
      return;
    }

    editorSessionRef.current += 1;
    singleChunkEditionCache.current = {};
    editionCache.current = {};
    savingRef.current = false;
    mceDataEditInProgressRef.current = false;
    editionGenerationInProgressRef.current = false;
    pendingEditionGenerationRequestRef.current = null;
    inFlightChunkLoadRequestsRef.current = {};
    chunkLoadBatchRequestRef.current = 0;

    const initialMceData = MceData.createEmpty();
    latestMceDataRef.current = initialMceData;
    latestMceDataIdRef.current = mceDataId;
    const initialHistory = new StateHistory<MceComposerHistoryState>({mceData: initialMceData});
    setMceComposerStatus('loadingMce');
    setErrorMsg('');
    setCtDataStatusArray([]);
    setMceData(initialMceData);
    setEdition(null);
    setEditionGenerationProgress(null);
    setHistory(initialHistory);
    setHistoryVersion(v => v + 1);
    setSavedStateSignature(initialHistory.getCurrentStateSignature());
    setChunksPanelVersion(v => v + 1);
    setChanges([]);
    setFoundBug(false);
    setFoundBugDescription('');
    if (operationalActionErrorTimeoutRef.current !== null) {
      clearTimeout(operationalActionErrorTimeoutRef.current);
      operationalActionErrorTimeoutRef.current = null;
    }
    setOperationalActionErrorMsg(null);
    setEditionOutOfDate(true);
    setSaving(false);
    setSaveError(null);
    setLastFullChunkLoadTime(null);
  }, [id, versionString, isMceDataIdValid]);

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
      const editorSession = editorSessionRef.current;
      getInitialInfo(mceDataId, versionString ?? undefined)
        .then((resp) => {
          if (ignore || editorSession !== editorSessionRef.current) {
            return; // avoid problems with React strict mode
          }
          console.log(`MCE Data for edition ${mceDataId}`, resp.mceData);

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
          setVersions(resp.versions);
          setIsLastVersion(resp.isLastVersion);
          setCtDataStatusArray(initialCtDataStatusArray);
          setMceComposerStatus('loadingSingleChunks');
        })
        .catch((error) => {
          if (ignore || editorSession !== editorSessionRef.current) {
            return; // avoid problems with React strict mode
          }
          setMceComposerStatus('error');
          setErrorMsg(`Failed to load MCE data from server: ${getMessageFromThrownError(error)}`);
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

    if (mceData.chunks.length === 0) {
      setMceComposerStatus('loaded');
      return;
    }
    // Check if we are fully done
    const allLoaded = ctDataStatusArray.every(st => st.ctDataState === 'loaded');
    const hasErrors = ctDataStatusArray.some(st => st.ctDataState === 'error');

    if (allLoaded || ctDataStatusArray.length === 0) {
      // console.log('All chunks loaded', ctDataStatusArray);
      if (allLoaded) {
        setLastFullChunkLoadTime(new Date());
      }
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
    const editorSession = editorSessionRef.current;
    const batchRequest = chunkLoadBatchRequestRef.current + 1;
    chunkLoadBatchRequestRef.current = batchRequest;

    // Instantly mark the selected batch as 'loading' in local state so the next render cycle knows not to
    // double-trigger it.
    setCtDataStatusArray(prev => {
      const next = [...prev];
      chunkIndexesToLoad.forEach((chunkIndex) => {
        next[chunkIndex] = {...next[chunkIndex], ctDataState: 'loading'};
      });
      return next;
    });

    const getChunkLoadPromise = (chunkToLoad: CtDataStatus): Promise<ChunkLoadResult> => {
      const requestKey = `${chunkToLoad.ctDataId}:${chunkToLoad.requestedVersion}`;
      let chunkLoadPromise = inFlightChunkLoadRequestsRef.current[requestKey];
      if (chunkLoadPromise === undefined) {
        chunkLoadPromise = (async () => {
          try {
            // console.log(`Fetching chunk ${chunkToLoad.ctDataId}`);
            const apiResponse = await appContext.apiClient.getSingleChunkData(chunkToLoad.ctDataId, chunkToLoad.requestedVersion);
            let lastVersionTimeStamp = apiResponse.timeStamp;
            if (!apiResponse.isLatestVersion) {
              // console.log(`Chunk ${chunkToLoad.ctDataId} is not the latest version`);
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
              errorMsg: getMessageFromThrownError(error),
            };
          }
        })()
          .finally(() => {
            delete inFlightChunkLoadRequestsRef.current[requestKey];
          });
        inFlightChunkLoadRequestsRef.current[requestKey] = chunkLoadPromise;
      }

      return chunkLoadPromise;
    };

    Promise.all(chunksToLoad.map((chunkToLoad) => getChunkLoadPromise(chunkToLoad)))
      .then((results) => {
        if (editorSession !== editorSessionRef.current || batchRequest !== chunkLoadBatchRequestRef.current) {
          return;
        }
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
    const editorSession = editorSessionRef.current;

    const mceDataHash = getMceDataHash(mceData, mceDataId);
    if (editionCache.current[mceDataHash] !== undefined) {
      // console.log(`getEdition ${mceDataHash}: cache hit`);
      if (editorSession === editorSessionRef.current) {
        setEditionGenerationProgress(null);
      }
      return editionCache.current[mceDataHash];
    }
    // console.log(`getEdition ${mceDataHash}: cache miss`);
    const profiler = new BasicProfiler('RegenerateEdition', true);
    const singleChunkEditionCacheKey = (chunkIndex: number) => {
      const chunkInfo = mceData.chunks[chunkIndex];
      const margFoliationArray = mceData.includeInAutoMarginalFoliation ?? [];
      const marginalKey = margFoliationArray.length === 0 ? 'no_marginals' : margFoliationArray.join('_');

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
        if (editorSession === editorSessionRef.current) {
          singleChunkEditionCache.current[singleChunkEditionCacheKey(chunkIndex)] = new Edition().setFromInterface(edition);
        }
      },
      onProgressUpdate: (step, numSteps) => {
        if (editorSession === editorSessionRef.current) {
          setEditionGenerationProgress(step / numSteps);
        }
      }
    });
    const generatedEdition = new Edition().setFromInterface(await generator.generate(mceData, mceDataId));
    profiler.stop();
    if (editorSession !== editorSessionRef.current) {
      return generatedEdition;
    }
    setEditionGenerationProgress(null);
    // console.log(`getEdition ${mceDataHash}: edition generated`);
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
    // console.log(`mceData change effect: ${mceDataId}, mceData hash ${getMceDataHash(mceData, mceDataId)}`);
    if (!isEditionInCache(mceData, mceDataId)) {
      // console.log(`mceData change: edition hash ${getMceDataHash(mceData, mceDataId)} not in cache`, mceData);
      setEditionOutOfDate(true);
      if (settings.autoRegenerate && mceData.chunks.length > 0) {
        regenerateEdition(mceData, mceDataId).then();
      }
    } else {
      const editorSession = editorSessionRef.current;
      getEdition(mceData, mceDataId).then((generatedEdition) => {
        if (editorSession !== editorSessionRef.current) {
          return;
        }
        setEdition(generatedEdition);
        setEditionOutOfDate(false);
      });
    }
  }, [mceData, mceDataId, settings.autoRegenerate]);

  useEffect(() => {
    latestMceDataRef.current = mceData;
    latestMceDataIdRef.current = mceDataId;
  }, [mceData, mceDataId]);

  useEffect(() => {
    latestAutoRegenerateRef.current = settings.autoRegenerate;
  }, [settings.autoRegenerate]);

  useEffect(() => {
    document.title = `MCE: ${mceData.title}`;
  }, [mceData]);

  useEffect(() => {
    const hasUnsavedChanges = changes.length > 0;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = 'true';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [changes]);

  useEffect(() => {
    return () => {
      if (operationalActionErrorTimeoutRef.current !== null) {
        clearTimeout(operationalActionErrorTimeoutRef.current);
        operationalActionErrorTimeoutRef.current = null;
      }
    };
  }, []);

  const clearOperationalActionError = () => {
    if (operationalActionErrorTimeoutRef.current !== null) {
      clearTimeout(operationalActionErrorTimeoutRef.current);
      operationalActionErrorTimeoutRef.current = null;
    }
    setOperationalActionErrorMsg(null);
  };

  const reportOperationalActionError = (actionName: string, error: OperationalError) => {
    console.warn(`${actionName} failed`, error);
    clearOperationalActionError();
    const errorMessage = getMessageFromThrownError(error);
    setOperationalActionErrorMsg(`${actionName} failed. ${errorMessage}`);
    operationalActionErrorTimeoutRef.current = setTimeout(() => {
      setOperationalActionErrorMsg(null);
      operationalActionErrorTimeoutRef.current = null;
    }, OPERATIONAL_ACTION_ERROR_TIMEOUT_MS);
  };

  const reportActionBug = (actionName: string, error: unknown) => {
    console.warn(`${actionName} failed`, error);
    setFoundBug(true);
    setFoundBugDescription(`${actionName} failed. ${getMessageFromThrownError(error)}`);
  };

  const reportActionError = (actionName: string, error: unknown): boolean => {
    if (error instanceof OperationalError) {
      reportOperationalActionError(actionName, error);
      return false;
    }

    reportActionBug(actionName, error);
    return true;
  };

  const startMceDataEdit = () => {
    clearOperationalActionError();
    if (!isMceDataEditingAllowed(mceComposerStatus) || savingRef.current || mceDataEditInProgressRef.current) {
      return false;
    }
    mceDataEditInProgressRef.current = true;
    return true;
  };

  const finishMceDataEdit = () => {
    mceDataEditInProgressRef.current = false;
  };

  const getMceDataEditError = () => {
    if (!isMceDataEditingAllowed(mceComposerStatus)) {
      return MCE_DATA_NOT_LOADED_ERROR;
    }
    return savingRef.current ? SAVING_EDIT_ERROR : EDIT_IN_PROGRESS_ERROR;
  };

  const isMceDataEditBlocked = () => {
    return !isMceDataEditingAllowed(mceComposerStatus) || savingRef.current || mceDataEditInProgressRef.current;
  };

  const deleteChunk = async (chunkIndex: number): Promise<boolean> => {
    // console.log("deleteChunk", chunkIndex);
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new DeleteChunkAction(chunkIndex));
      } catch (error) {
        reportActionError('DeleteChunkAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const getDocTitle = async (docId: number): Promise<string> => {
    const docInfo = await appContext.apiClient.getDocumentInfo(docId, false, false);
    return docInfo.title;
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
    // console.log(`Add chunk from table ${tableId}, version '${version}'`);
    if (!startMceDataEdit()) {
      return getMceDataEditError();
    }
    try {
      const currentMceData = history.getCurrentState().mceData;
      if (currentMceData.chunks.some( (chunk) => chunk.chunkEditionTableId === tableId)) {
        return `Table ${tableId} is already included in this MCE`;
      }

      let chunkApiData: SingleChunkApiData;
      try {
        chunkApiData = await appContext.apiClient.getSingleChunkData(tableId, version);
        if (currentMceData.chunks.length !== 0 && chunkApiData.ctData.lang !== currentMceData.lang) {
          return `Table ${tableId} is in ${ApmFormats.getLangName(chunkApiData.ctData.lang)}, only ${ApmFormats.getLangName(currentMceData.lang)} tables are allowed`;
        }
      } catch (error) {
        return getMessageFromThrownError(error);
      }

      try {
        await history.do(new AddChunkAction(
          tableId,
          chunkApiData,
          getDocTitle,
          getSourceTitle,
        ));
      } catch (error) {
        if (reportActionError('AddChunkAction', error)) {
          return 'Bug found';
        }
        return getMessageFromThrownError(error);
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
    } finally {
      finishMceDataEdit();
    }
  };

  const moveChunk = async (chunkPosition: number, direction: 'up' | 'down'): Promise<boolean> => {
    // console.log(`Move chunk at position ${chunkPosition} '${direction}'`);
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new MoveChunkAction(chunkPosition, direction === 'up' ? 'backwards' : 'forwards'));
      } catch (error) {
        reportActionError('MoveChunkAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const setChunkBreak = async (chunkPosition: number, newBreak: string): Promise<boolean> => {
    // console.log(`Set break for chunk at position ${chunkPosition} to '${newBreak}'`);
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new SetChunkBreakAction(chunkPosition, newBreak));
      } catch (error) {
        reportActionError('SetChunkBreakAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      setChunksPanelVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const updateChunk = async (chunkIndex: number): Promise<true | string> => {
    // console.log(`Update chunk index ${chunkIndex}`);
    if (!startMceDataEdit()) {
      return getMceDataEditError();
    }
    try {
      const tableId = mceData.chunks[chunkIndex].chunkEditionTableId;
      let chunkApiData: SingleChunkApiData;
      try {
        chunkApiData = await appContext.apiClient.getSingleChunkData(tableId, '');
        if (chunkApiData.ctData.lang !== mceData.lang) {
          return `Table ${tableId} is in ${ApmFormats.getLangName(chunkApiData.ctData.lang)}, only ${ApmFormats.getLangName(mceData.lang)} tables are allowed`;
        }
      } catch (error) {
        return getMessageFromThrownError(error);
      }

      try {
        await history.do(new UpdateChunkAction(tableId,
          chunkApiData,
          getDocTitle,
          getSourceTitle,));
      } catch (error) {
        if (reportActionError('UpdateChunkAction', error)) {
          return 'Bug found';
        }
        return getMessageFromThrownError(error);
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
    } finally {
      finishMceDataEdit();
    }
  };

  const setSiglum = async (witnessIndex: number, newSiglum: string) => {
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new SetSiglumAction(witnessIndex, newSiglum));
      } catch (error) {
        reportActionError('SetSiglumAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const setIncludeInAutoMarginalFoliation = async (witnessIndex: number, newState: boolean) => {
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new SetIncludeInAutoMarginalFoliationAction(witnessIndex, newState));
      } catch (error) {
        reportActionError('SetIncludeInAutoMarginalFoliationAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const deleteSiglaGroup = async (siglaGroupIndex: number) => {
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new DeleteSiglaGroupAction(siglaGroupIndex));
      } catch (error) {
        reportActionError('DeleteSiglaGroupAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const changeSiglaGroup = async (siglaGroupIndex: number, newGroup: SiglaGroupInterface) => {
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      try {
        await history.do(new ChangeSiglaGroupAction(siglaGroupIndex, newGroup));
      } catch (error) {
        reportActionError('ChangeSiglaGroupAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const confirmTitleEdit = async (newTitle: string) => {
    if (!startMceDataEdit()) {
      return false;
    }
    try {
      const sanitizedTitle = newTitle.trim();
      if (sanitizedTitle === mceData.title) return;

      try {
        await history.do(new ChangeTitleAction(sanitizedTitle));
      } catch (error) {
        reportActionError('ChangeTitleAction', error);
        return false;
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const handleOnClickTabExpand = (tabKey: string) => {
    // console.log(`Click on expand tab ${tabKey}`);
    setExpandedTab(tabKey);
  };

  const handleOnClickCollapseTab = () => {
    // console.log(`Click on collapse icon`);
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
    // console.log(`Click on revert changes`);
    if (isMceDataEditBlocked()) {
      return;
    }
    const savedIndex = history.getHistory().findIndex(item => item.signature === savedStateSignature);
    if (savedIndex >= 0) {
      history.goToState(savedIndex);
      setHistoryVersion(v => v + 1);
      setChunksPanelVersion(v => v + 1);
    }
  };

  const checkForChunkUpdates = async (): Promise<true | string> => {
    try {
      const updatePromises = ctDataStatusArray.map(async (ctDataStatus) => {
        if (ctDataStatus.ctDataState !== 'loaded') {
          return ctDataStatus;
        }
        if (ctDataStatus.loadedVersionTimeStamp === null) {
          return ctDataStatus;
        }
        const tableId = ctDataStatus.ctDataId;
        // console.log(`Checking for chunk updates for table ${tableId}`);
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
      return true;
    } catch (error) {
      console.error('Could not check for chunk updates', error);
      if (error instanceof ApmApiClientError && error.errorType === 'network') {
        return 'Could not retrieve chunk status: Network Error';
      }
      return 'Could not retrieve chunk status: unexpected error';
    }
  };


  const isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string = (siglaGroupIndex, group) => {
    return MceData.isSiglaGroupValid(mceData, siglaGroupIndex, group);
  };

  const isSiglumValid: (witnessIndex: number, siglum: string) => true | string = (witnessIndex, siglum) => {
    return MceData.isSiglumValid(mceData, witnessIndex, siglum);
  };

  const isTitleValid: (title: string) => true | string = (title) => {
    if (title.trim() === '') {
      return 'Title must have a non-empty value';
    }
    return true;
  };

  const regenerateEdition = async (requestedMceData: MceDataInterface = mceData, requestedMceDataId: number = mceDataId) => {
    pendingEditionGenerationRequestRef.current = {
      signature: getMceDataHash(requestedMceData, requestedMceDataId),
      mceData: requestedMceData,
      mceDataId: requestedMceDataId,
    };

    if (editionGenerationInProgressRef.current) {
      return;
    }

    while (pendingEditionGenerationRequestRef.current !== null) {
      const generationRequest: PendingEditionGenerationRequest | null = pendingEditionGenerationRequestRef.current;
      pendingEditionGenerationRequestRef.current = null;
      const editorSession = editorSessionRef.current;
      editionGenerationInProgressRef.current = true;
      try {
        setEditionGenerationProgress(0);
        await nextTick();
        const newEdition = await getEdition(generationRequest.mceData, generationRequest.mceDataId);
        if (editorSession !== editorSessionRef.current || newEdition === null) {
          continue;
        }

        const currentMceData = latestMceDataRef.current;
        const currentMceDataId = latestMceDataIdRef.current;
        const currentSignature = getMceDataHash(currentMceData, currentMceDataId);
        if (generationRequest.signature === currentSignature) {
          console.log(`Setting edition`, newEdition);
          setEdition(newEdition);
          setEditionOutOfDate(false);
          continue;
        }

        setEditionOutOfDate(true);
        if (latestAutoRegenerateRef.current && currentMceData.chunks.length > 0) {
          pendingEditionGenerationRequestRef.current = {
            signature: currentSignature,
            mceData: currentMceData,
            mceDataId: currentMceDataId,
          };
        }
      } finally {
        if (editorSession === editorSessionRef.current) {
          setEditionGenerationProgress(null);
        }
        editionGenerationInProgressRef.current = false;
      }
    }
  };

  const handleOnClickRegenerate = () => {
    // console.log(`Click on regenerate`);
    regenerateEdition(mceData, mceDataId).then();
  };

  const addStandardizedString = async (original: string, standardized: string): Promise<true | string> => {
    if (!startMceDataEdit()) {
      return getMceDataEditError();
    }
    try {
      try {
        await history.do(new AddStandardizedStringAction(original, standardized));
      } catch (error) {
        if (reportActionError('AddStandardizedStringAction', error)) {
          return 'Bug found';
        }
        return getMessageFromThrownError(error);
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const deleteStandardizedString = async (original: string): Promise<true | string> => {
    if (!startMceDataEdit()) {
      return getMceDataEditError();
    }
    try {
      try {
        await history.do(new DeleteStandardizedStringAction(original));
      } catch (error) {
        if (reportActionError('DeleteStandardizedStringAction', error)) {
          return 'Bug found';
        }
        return getMessageFromThrownError(error);
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const resetStandardizedString = async (original: string): Promise<true | string> => {
    if (!startMceDataEdit()) {
      return getMceDataEditError();
    }
    try {
      try {
        await history.do(new ResetStandardizedStringAllAction(original));
      } catch (error) {
        if (reportActionError('ResetStandardizedStringAction', error)) {
          return 'Bug found';
        }
        return getMessageFromThrownError(error);
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const setStandardizedStringInstanceStatus = async (str: string, index: number, status: StandardizedStringInstanceStatus): Promise<true | string> => {
    if (!startMceDataEdit()) {
      return getMceDataEditError();
    }
    try {
      try {
        await history.do(new SetStandardizedStringInstanceStatusAction(str, index, status));
      } catch (error) {
        if (reportActionError('SetStandardizedStringInstanceStatusAction', error)) {
          return 'Bug found';
        }
        return getMessageFromThrownError(error);
      }
      setHistoryVersion(v => v + 1);
      return true;
    } finally {
      finishMceDataEdit();
    }
  };

  const standardizedWords = useMemo( () => edition !== null && mceData !== null ? StandardizedWords.build(mceData.standardizedStrings, edition) : [], [edition, mceData]);

  const handleOnClickSaveButton = async (description: string) => {
    // console.log(`Click on save`);
    if (!isMceDataEditingAllowed(mceComposerStatus) || savingRef.current || mceDataEditInProgressRef.current || changes.length === 0) {
      console.warn(`Cannot save MCE data because there are no changes`);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await nextTick();
      const response = await appContext.apiClient.apiMceSave({
        editionId: mceDataId,
        mceData,
        description: description === '' ? changes.join('. ') : description
      });
      if (response.result === 'Error') {
        setSaveError(response.message ?? 'Error saving');
        return;
      }
      console.log(`Saved MCE data`, response);
      if (mceDataId === -1) {
        navigate(RouteUrls.multiChunkEdition(response.id));
      }
      // reset history
      history.reset(history.getCurrentState(), 'Last save');
      setSavedStateSignature(history.getHistory()[0].signature);
      setChanges([]);
    } catch (error) {
      const errorMessage = getMessageFromThrownError(error);
      setSaveError(errorMessage === '' || errorMessage === 'Unknown error' ? 'Error saving' : errorMessage);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
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
    try {
      const activeEditions = await appContext.apiClient.getActiveEditions();
      const workIds = MceData.getWorkIds(mceData);
      if (mceData.chunks.length === 0) {
        return activeEditions;
      }
      return activeEditions.filter(e => workIds.includes(e.workId));
    } catch (e) {
      return getMessageFromThrownError(e);
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
                            lastFullChunkLoadTime={lastFullChunkLoadTime}
                            chunkOrder={mceData.chunkOrder}
                            ctDataStatusArray={ctDataStatusArray}
                            moveChunk={moveChunk}
                            updateChunk={updateChunk}
                            deleteChunk={deleteChunk}
                            checkForChunkUpdates={checkForChunkUpdates}
                            setChunkBreak={setChunkBreak}/>,
      tabbable: true,
    },
    {
      panel: 'one',
      key: 'witnesses',
      title: 'Witnesses',
      content: <WitnessesPanel witnesses={getDataForWitnessPanel()}
                               siglaGroups={mceData.siglaGroups}
                               onChangeSiglum={setSiglum}
                               isSiglumValid={isSiglumValid}
                               isSiglaGroupValid={isSiglaGroupValid}
                               onDeleteSiglaGroup={deleteSiglaGroup}
                               onChangeSiglaGroup={changeSiglaGroup}
                               onChangeIncludeInAutoMarginalFoliation={setIncludeInAutoMarginalFoliation}/>,
      tabbable: true,
    },

    {
      panel: 'one',
      key: 'standardization',
      title: 'Standardization',
      expandable: false,
      content: <StandardizationPanel standardizedWords={standardizedWords}
                                    add={addStandardizedString}
                                    delete={deleteStandardizedString}
                                    reset={resetStandardizedString}/>,
      tabbable: true,
    },
    {
      panel: 'two',
      key: 'mainText',
      title: 'Edition Text',
      expandable: true,
      content: <MainTextPanel edition={edition} standardizedWords={standardizedWords}
                              generationProgress={editionGenerationProgress} editionOutOfDate={editionOutOfDate}
                              onClickRegenerate={handleOnClickRegenerate}
                              setInstanceStatus={setStandardizedStringInstanceStatus}/>,
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
      content: <AddChunksPanel addChunk={addChunk}
                               currentChunkTableIds={mceData.chunks.map(chunk => chunk.chunkEditionTableId) ?? []}
                               getActiveEditions={getActiveEditions}/>,
      tabbable: true,
    },
    {
      panel: 'two',
      key: 'session',
      title: 'Session',
      content: <SessionPanel history={history}
                             savedStateSignature={savedStateSignature}
                             historyVersion={historyVersion}
                             onGoTo={(idx) => {
                               if (isMceDataEditBlocked()) {
                                 return;
                               }
                               history.goToState(idx);
                               setHistoryVersion(v => v + 1);
                             }}
                             onClearHistory={() => {
                               if (isMceDataEditBlocked()) {
                                 return;
                               }
                               const savedIndex = history.getHistory().findIndex(item => item.signature === savedStateSignature);
                               if (savedIndex >= 0) {
                                 history.clear(savedIndex);
                                 setHistoryVersion(v => v + 1);
                               }
                             }}
      />,
      tabbable: true,
    },
    {
      panel: 'two',
      key: 'admin',
      title: 'Admin',
      expandable: false,
      tabbable: true,
      content: <AdminPanel versions={versions} version={versionString} mceId={mceDataId}/>
    }
  ];

  if (routeErrorMsg !== null) {
    return <StatusPage label={'Error'}>
      <h2>Oops!</h2>
      <p className={'text-danger'}>{routeErrorMsg}</p>
      <p>This may be a bug, please report it.</p>
    </StatusPage>;
  }

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
    {isLastVersion !== null && !isLastVersion && <NotLastVersionWarningButton version={versionString}/>}
    {mceComposerStatus === 'loadingSingleChunks' && loadingProgress}
    {editionGenerationProgressBar}
    {operationalActionErrorMsg !== null && <span className={'text-danger action-error-message'}>{operationalActionErrorMsg}</span>}
    {saving && <span className={'text-primary'}>Saving... <Spinner size={'sm'}/></span>}
  </div>;

  const controlsDiv = <div className={'controls'}>
    {!foundBug && <Arrow90degLeft className={'icon-btn' + (canUndo ? '' : ' disabled')}
                                  title={undoTitle}
                                  onClick={() => {
                                    if (isMceDataEditBlocked()) {
                                      return;
                                    }
                                    history.undo();
                                    setHistoryVersion(v => v + 1);
                                    setChunksPanelVersion(v => v + 1);
                                  }}/>}
    {!foundBug && <Arrow90degRight className={'icon-btn' + (canRedo ? '' : ' disabled')}
                                   title={redoTitle}
                                   onClick={() => {
                                     if (isMceDataEditBlocked()) {
                                       return;
                                     }
                                     history.redo();
                                     setHistoryVersion(v => v + 1);
                                     setChunksPanelVersion(v => v + 1);
                                   }}/>}

    {!foundBug && <ComponentWithPending pending={saving}>
      <MceComposerSaveButton changes={changes} executeSave={handleOnClickSaveButton} saveError={saveError}/>
    </ComponentWithPending>}
    {!foundBug && <ArrowCounterclockwise className={'icon-btn' + (changes.length > 0 ? ' highlighted' : ' disabled')}
                                         onClick={() => handleOnClickRevertChanges()}
                                         title={'Click to revert to last saved version'}/>}
    {foundBug && <BugWarningButton foundBugDescription={foundBugDescription}/>}
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
                         validator={isTitleValid}
                         onConfirm={confirmTitleEdit}/>
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