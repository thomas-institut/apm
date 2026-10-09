import {useParams} from "react-router";
import './EditionComposer.css';
import {StatusPage} from "@/ReactAPM/Components/StatusPage/StatusPage";
import {useContext, useEffect, useRef, useState} from "react";
import {Spinner} from "react-bootstrap";
import {Arrow90degLeft, Arrow90degRight, ArrowCounterclockwise, Save} from "react-bootstrap-icons";
import {AppContext} from "@/ReactAPM/App";
import {CtDataInterface} from "@/CtData/CtDataInterface";
import {CtVersionInfo} from "@/Api/DataSchema/ApiCollationTable";
import {panelsFromSpecs, PanelSpec} from "@/ReactAPM/Components/PanelUI/PanelSpec";
import MainTextPanel from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel";
import AdminPanel from "@/ReactAPM/Pages/EditionComposer/AdminPanel/AdminPanel";
import ApmLogo from "@/ReactAPM/Components/ApmLogo/ApmLogo";
import EditableTextField from "@/ReactAPM/Components/EditableTextField";
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";
import CtPanel from "@/ReactAPM/Pages/EditionComposer/CtPanel/CtPanel";
import {CtData} from "@/CtData/CtData";
import {SiglaGroupInterface} from "@/CtData/CtDataInterface";
import {CtDataEditionGenerator} from "@/Edition/EditionGenerator/CtDataEditionGenerator";
import {Edition} from "@/Edition/Edition";
import {ApparatusPanel} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusPanel";
import PreviewPanel from "@/ReactAPM/Components/PreviewPanel/PreviewPanel";
import {MainTextIndexToLineMap} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import NotLastVersionWarningButton from "@/ReactAPM/Components/NotLastVersionWarningButton";
import ArchivedEditionWarningButton from "@/ReactAPM/Components/ArchivedEditionWarningButton";
import {StateHistory} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";
import {deepCopy} from "@/toolbox/Util";
import {UpdateTitleAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateTitleAction";
import {OperationalError} from "@/lib/Error/SystemError";
import BugWarningButton from "@/ReactAPM/Components/BugWarningButton";
import SessionPanel from "@/ReactAPM/Components/SessionPanel/SessionPanel";
import WitnessesPanel, {EditionWitnessData} from "@/ReactAPM/Pages/EditionComposer/WitnessesPanel/WitnessesPanel";
import {UpdateWitnessOrderAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateWitnessOrderAction";
import {UpdateSiglumAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateSiglumAction";
import {UpdateExcludeFromAutoCriticalApparatusStatusAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateExcludeFromAutoCriticalApparatusStatusAction";
import {UpdateIncludeInAutoMarginalFoliationStatusAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateIncludeInAutoMarginalFoliationStatusAction";
import {ChangeSiglaGroupAction} from "@/ReactAPM/Pages/EditionComposer/Actions/ChangeSiglaGroupAction";
import {DeleteSiglaGroupAction} from "@/ReactAPM/Pages/EditionComposer/Actions/DeleteSiglaGroupAction";
import {StateTransformAction} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";

type ComposerStatus = 'start' | 'loading' | 'loadingNewVersion' | 'error' | 'loaded';

const OPERATIONAL_ACTION_ERROR_TIMEOUT_MS = 5000;

const getMessageFromThrownError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error ?? 'Unknown error');
};

export interface EditionComposerHistoryState {
  ctData: CtDataInterface
}


export default function EditionComposer() {

  const {id, version} = useParams();
  const [composerStatus, setComposerStatus] = useState<ComposerStatus>('start');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [ctData, setCtData] = useState<CtDataInterface | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [versions, setVersions] = useState<CtVersionInfo[]>([]);
  const [isLatestVersion, setIsLatestVersion] = useState<boolean | null>(null);
  const [mainTextIndexToLineNumberMap, setMainTextIndexToLineNumberMap] = useState<MainTextIndexToLineMap | null>(null);
  const [history, setHistory] = useState<StateHistory<EditionComposerHistoryState> | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [savedStateSignature, setSavedStateSignature] = useState<string | null>(null);
  const [foundBug, setFoundBug] = useState(false);
  const [foundBugDescription, setFoundBugDescription] = useState('');
  const [operationalActionErrorMsg, setOperationalActionErrorMsg] = useState<string | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [versionTimeStamp, setVersionTimeStamp] = useState('');
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const [activeTabPanelOne, setActiveTabPanelOne] = useState('mainText');
  const [activeTabPanelTwo, setActiveTabPanelTwo] = useState('admin');

  const appContext = useContext(AppContext);
  const shimWidth = 5;
  const previousRoute = useRef({id, version});
  const actionInProgressRef = useRef(false);
  const operationalActionErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isCurrentRequest = true;
    const isLoadingNewVersion = id === previousRoute.current.id && version !== previousRoute.current.version && ctData !== null;
    previousRoute.current = {id, version};

    setComposerStatus(isLoadingNewVersion ? 'loadingNewVersion' : 'loading');
    setErrorMsg('');
    actionInProgressRef.current = false;
    setIsActionInProgress(false);
    setFoundBug(false);
    setFoundBugDescription('');
    if (operationalActionErrorTimeoutRef.current !== null) {
      clearTimeout(operationalActionErrorTimeoutRef.current);
      operationalActionErrorTimeoutRef.current = null;
    }
    setOperationalActionErrorMsg(null);
    if (!isLoadingNewVersion) {
      setCtData(null);
      setEdition(null);
      setHistory(null);
      setSavedStateSignature(null);
      setHistoryVersion(v => v + 1);
      setVersions([]);
      setIsLatestVersion(null);
      setMainTextIndexToLineNumberMap(null);
      setVersionTimeStamp('');
      setExpandedTab(null);
      setActiveTabPanelOne('mainText');
      setActiveTabPanelTwo('admin');
    }

    const loadTableData = async () => {
      if (!id) {
        setErrorMsg('Edition ID is missing');
        setComposerStatus('error');
        return;
      }
      const tableId = parseInt(id);
      if (isNaN(tableId)) {
        setErrorMsg('Edition ID is not a number');
        setComposerStatus('error');
        return;
      }
      if (tableId < 0) {
        setErrorMsg('Edition ID must be a positive number');
        setComposerStatus('error');
        return;
      }

      let result;
      try {
        result = await appContext.apiClient.getSingleChunkData(tableId, version ?? '');
      } catch (error) {
        if (isCurrentRequest) {
          setErrorMsg('Failed to load edition data');
          setComposerStatus('error');
        }
        return;
      }

      if (!isCurrentRequest) {
        return;
      }

      console.log(`Data for edition ${id}:`, result);
      try {
        const cleanCtData = CtData.getCleanAndUpdatedCtData(result.ctData);
        console.log(`Cleaned CT data for edition ${id}:`, cleanCtData);
        const generatedEdition = new CtDataEditionGenerator({ctData: cleanCtData}).generateEdition();
        const initialHistory = new StateHistory<EditionComposerHistoryState>(deepCopy({ctData: cleanCtData}));
        setCtData(cleanCtData);
        setEdition(generatedEdition);
        setHistory(initialHistory);
        setHistoryVersion(v => v + 1);
        setSavedStateSignature(initialHistory.getCurrentStateSignature());
        setMainTextIndexToLineNumberMap(null);
        setVersions(result.versions);
        setIsLatestVersion(result.isLatestVersion);
        setVersionTimeStamp(result.timeStamp);
        setComposerStatus('loaded');
      } catch (error) {
        console.warn(`Error cleaning CT data for edition ${id}:`, error);
        // @ts-ignore
        setErrorMsg("Error loading edition data: " + error.toString());
        setComposerStatus('error');
      }
    };

    loadTableData().then(() => {
      console.log('Edition data loaded');
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [id, version, appContext.apiClient]);

  useEffect(() => {
    return () => {
      if (operationalActionErrorTimeoutRef.current !== null) {
        clearTimeout(operationalActionErrorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (ctData === null) {
      return;
    }
    document.title = `${ctData.title} (${ctData.chunkId})`;
  }, [ctData]);


  if (composerStatus === 'error') {
    return <StatusPage label={'Error'}>
      <h2>Oops!</h2>
      <p className={'text-danger'}>{errorMsg}</p>
      <p>This may be a bug, please report it.</p>
    </StatusPage>;
  }

  if (composerStatus === 'loading') {
    return <StatusPage label={'Single Chunk Edition'}>Loading single chunk edition {id}...<Spinner
      size="sm"/></StatusPage>;
  }

  if (composerStatus === 'start') {
    return <StatusPage label={'Single Chunk Edition'}>Starting...</StatusPage>;
  }

  if (ctData === null || edition === null || history === null || savedStateSignature === null) {
    setErrorMsg('Unexpected null data after loading. This is certainly a bug, please report it.');
    return <h1>Bug!!</h1>;
  }

  const setDisplayedHistoryState = (state: EditionComposerHistoryState) => {
    setCtData(state.ctData);
    setEdition(new CtDataEditionGenerator({ctData: state.ctData}).generateEdition());
    setHistoryVersion(v => v + 1);
  };

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
    setOperationalActionErrorMsg(`${actionName} failed. ${getMessageFromThrownError(error)}`);
    operationalActionErrorTimeoutRef.current = setTimeout(() => {
      setOperationalActionErrorMsg(null);
      operationalActionErrorTimeoutRef.current = null;
    }, OPERATIONAL_ACTION_ERROR_TIMEOUT_MS);
  };

  const reportActionError = (actionName: string, error: unknown): boolean => {
    if (error instanceof OperationalError) {
      reportOperationalActionError(actionName, error);
      return false;
    }

    console.warn(`${actionName} failed`, error);
    setFoundBug(true);
    setFoundBugDescription(`${actionName} failed. ${getMessageFromThrownError(error)}`);
    return true;
  };

  const isTitleValid = (title: string): true | string => {
    return title.trim() === '' ? 'Title must have a non-empty value' : true;
  };

  const updateTitle = async (newTitle: string) => {
    if (isTitleValid(newTitle) !== true || composerStatus !== 'loaded' || ctData.archived || foundBug || actionInProgressRef.current) {
      return;
    }

    clearOperationalActionError();
    actionInProgressRef.current = true;
    setIsActionInProgress(true);
    try {
      await history.do(new UpdateTitleAction(newTitle));
      setDisplayedHistoryState(history.getCurrentState());
    } catch (error) {
      reportActionError('UpdateTitleAction', error);
    } finally {
      actionInProgressRef.current = false;
      setIsActionInProgress(false);
    }
  };

  const notificationsDiv = <div>
    {!isLatestVersion && <NotLastVersionWarningButton version={versionTimeStamp} label={'Outdated Version'}/>}
    {ctData.archived && <ArchivedEditionWarningButton label={'Archived'}/>}
    {operationalActionErrorMsg !== null && <span className={'text-danger action-error-message'}>{operationalActionErrorMsg}</span>}
  </div>;

  const historyItems = history.getHistory();
  const currentStateIndex = history.getCurrentStateIndex();
  const canUndo = currentStateIndex > 0;
  const canRedo = currentStateIndex < historyItems.length - 1;
  const hasUnsavedChanges = history.getCurrentStateSignature() !== savedStateSignature;
  const canEdit = composerStatus === 'loaded' && !ctData.archived && !foundBug && !isActionInProgress;
  const undoTitle = canUndo ? `Undo ${historyItems[currentStateIndex].actionDescription}` : 'Undo';
  const redoTitle = canRedo ? `Redo ${historyItems[currentStateIndex + 1].actionDescription}` : 'Redo';

  const runHistoryAction = async (action: StateTransformAction<EditionComposerHistoryState>, actionName: string): Promise<boolean> => {
    if (!canEdit || actionInProgressRef.current) {
      return false;
    }
    clearOperationalActionError();
    actionInProgressRef.current = true;
    setIsActionInProgress(true);
    try {
      await history.do(action);
      setDisplayedHistoryState(history.getCurrentState());
      return true;
    } catch (error) {
      reportActionError(actionName, error);
      return false;
    } finally {
      actionInProgressRef.current = false;
      setIsActionInProgress(false);
    }
  };

  const moveWitness = async (witnessIndex: number, direction: 'up' | 'down'): Promise<boolean> => {
    const newWitnessOrder = [...history.getCurrentState().ctData.witnessOrder];
    const currentPosition = newWitnessOrder.indexOf(witnessIndex);
    const newPosition = currentPosition + (direction === 'up' ? -1 : 1);
    if (currentPosition < 0 || newPosition < 0 || newPosition >= newWitnessOrder.length) {
      return false;
    }
    [newWitnessOrder[currentPosition], newWitnessOrder[newPosition]] = [newWitnessOrder[newPosition], newWitnessOrder[currentPosition]];
    return runHistoryAction(new UpdateWitnessOrderAction(newWitnessOrder), 'UpdateWitnessOrderAction');
  };

  const updateSiglum = (witnessIndex: number, newSiglum: string) =>
    runHistoryAction(new UpdateSiglumAction(witnessIndex, newSiglum), 'UpdateSiglumAction');

  const updateExcludeFromAutoCriticalApparatusStatus = (witnessIndex: number, newStatus: boolean) =>
    runHistoryAction(new UpdateExcludeFromAutoCriticalApparatusStatusAction(witnessIndex, newStatus), 'UpdateExcludeFromAutoCriticalApparatusStatusAction');

  const updateIncludeInAutoMarginalFoliationStatus = (witnessIndex: number, newStatus: boolean) =>
    runHistoryAction(new UpdateIncludeInAutoMarginalFoliationStatusAction(witnessIndex, newStatus), 'UpdateIncludeInAutoMarginalFoliationStatusAction');

  const updateSiglaGroup = (siglaGroupIndex: number, group: SiglaGroupInterface) =>
    runHistoryAction(new ChangeSiglaGroupAction(siglaGroupIndex, group), 'ChangeSiglaGroupAction');

  const deleteSiglaGroup = (siglaGroupIndex: number) =>
    runHistoryAction(new DeleteSiglaGroupAction(siglaGroupIndex), 'DeleteSiglaGroupAction');

  const orderedWitnesses: EditionWitnessData[] = ctData.witnessOrder.map(witnessIndex => ({
    witnessIndex,
    siglum: ctData.sigla[witnessIndex],
    title: ctData.witnessTitles[witnessIndex],
    excludeFromAutoCriticalApparatus: ctData.excludeFromAutoCriticalApparatus.includes(witnessIndex),
    includeInAutoMarginalFoliation: ctData.includeInAutoMarginalFoliation.includes(witnessIndex)
  }));

  const isSiglumValid = (witnessIndex: number, siglum: string): true | string =>
    CtData.isSiglumValid(ctData, witnessIndex, siglum);

  const isSiglaGroupValid = (siglaGroupIndex: number, group: SiglaGroupInterface): true | string =>
    CtData.isSiglaGroupValid(ctData, siglaGroupIndex, group);

  const resetToSavedState = () => {
    if (!canEdit) {
      return;
    }
    const savedIndex = history.getHistory().findIndex(item => item.signature === savedStateSignature);
    if (savedIndex >= 0) {
      const savedState = history.goToState(savedIndex);
      setDisplayedHistoryState(savedState);
    }
  };

  const handleOnClickSaveButton = () => {
    console.log(`Save requested for edition ${ctData.tableId}`);
  };

  const onLineNumberingChange = (lineNumbering: MainTextIndexToLineMap) => {
    setMainTextIndexToLineNumberMap(lineNumbering);
  };

  const archive = async (): Promise<true> => {
    console.log(`Archive requested for edition ${ctData.tableId}`);
    return true;
  };

  const panelSpecs: PanelSpec[] = [
    {
      panel: 'one',
      key: 'mainText',
      title: 'Main Text',
      content: <MainTextPanel mainText={edition.mainText} ctData={ctData}
                              onLineNumberingChange={onLineNumberingChange}/>
    },
    {
      panel: 'one',
      key: 'cTable',
      title: 'Collation',
      content: <CtPanel ctData={ctData}/>
    },
    {
      panel: 'one',
      key: 'witnesses',
      title: 'Witnesses',
      content: <WitnessesPanel witnesses={orderedWitnesses}
                               editionWitnessIndex={ctData.type === 'edition' ? ctData.editionWitnessIndex : null}
                               sigla={ctData.sigla}
                               siglaGroups={ctData.siglaGroups}
                               disabled={!canEdit}
                               isSiglumValid={isSiglumValid}
                               isSiglaGroupValid={isSiglaGroupValid}
                               onMoveWitness={moveWitness}
                               onChangeSiglum={updateSiglum}
                               onChangeExcludeFromAutoCriticalApparatus={updateExcludeFromAutoCriticalApparatusStatus}
                               onChangeIncludeInAutoMarginalFoliation={updateIncludeInAutoMarginalFoliationStatus}
                               onDeleteSiglaGroup={deleteSiglaGroup}
                               onChangeSiglaGroup={updateSiglaGroup}/>
    },

  ];

  edition.apparatuses.forEach((apparatus) => {
    panelSpecs.push({
      panel: 'two',
      key: `apparatus-${apparatus.type}`,
      title: apparatus.type,
      content: <ApparatusPanel apparatus={apparatus}
                               lineNumberMap={mainTextIndexToLineNumberMap}
                               sigla={ctData.sigla}
                               lang={ctData.lang}/>
    });
  });

  panelSpecs.push({
      panel: 'two',
      key: 'preview',
      title: 'Preview',
      content: <PreviewPanel editionKey={`edition-${id}`} edition={edition} getPdfUrl={async () => ''}/>
    }
  );

  panelSpecs.push({
    panel: 'two',
    key: 'session',
    title: 'Session',
    content: <SessionPanel history={history}
                           savedStateSignature={savedStateSignature}
                           historyVersion={historyVersion}
                           onGoTo={(index) => {
                             if (!canEdit) {
                               return;
                             }
                             const state = history.goToState(index);
                             setDisplayedHistoryState(state);
                           }}
                           onClearHistory={() => {
                             if (!canEdit) {
                               return;
                             }
                             const savedIndex = history.getHistory().findIndex(item => item.signature === savedStateSignature);
                             if (savedIndex >= 0) {
                               history.clear(savedIndex);
                               setHistoryVersion(v => v + 1);
                             }
                           }}/>
  });

  panelSpecs.push({
    panel: 'two',
    key: 'admin',
    title: 'Admin',
    content: <AdminPanel tableId={ctData.tableId}
                         versionTimeStamp={versionTimeStamp}
                         versions={versions}
                         isLatestVersion={isLatestVersion ?? false}
                         archive={archive}
                         isArchived={ctData.archived}
                         archivingEnabled={isLatestVersion ?? false}
                         loadingNewVersion={composerStatus === 'loadingNewVersion'}/>
  });

  return (<div className="ec-composer">
    <div className="header">
      <ApmLogo height={30} className={'logo'}/>
      <EditableTextField className={'title'} editingClassName={'title editing'} text={ctData.title}
                         disabled={!canEdit}
                         validator={isTitleValid}
                         onConfirm={updateTitle}/>
      <span>{ctData.chunkId}</span>
      {/* Notification area: only one element must be active, otherwise the layout will break */}
      {composerStatus !== 'loadingNewVersion' && notificationsDiv}
      {composerStatus === 'loadingNewVersion' && <span className={'version-loading'}><Spinner size="sm"/> Loading data...</span>}

      {/* Right side controls */}
      <div className={'controls'}>
        {!foundBug && <>
          <button type="button" aria-label="Undo" title={undoTitle} disabled={!canEdit || !canUndo}
                  onClick={() => {
                    const state = history.undo();
                    setDisplayedHistoryState(state);
                  }}>
            <Arrow90degLeft/>
          </button>
          <button type="button" aria-label="Redo" title={redoTitle} disabled={!canEdit || !canRedo}
                  onClick={() => {
                    const state = history.redo();
                    setDisplayedHistoryState(state);
                  }}>
            <Arrow90degRight/>
          </button>
          <button type="button" aria-label="Save" title="Save edition changes"
                  disabled={!canEdit || !hasUnsavedChanges} onClick={handleOnClickSaveButton}>
            <Save/>
          </button>
          <button type="button" aria-label="Reset" title="Reset to last saved version"
                  disabled={!canEdit || !hasUnsavedChanges} onClick={resetToSavedState}>
            <ArrowCounterclockwise/>
          </button>
        </>}
        {foundBug && <BugWarningButton foundBugDescription={foundBugDescription}/>}
      </div>
    </div>
    <SplitPanels direction={'vertical'} className="panelContainer" dividerClass="divider"
                 dividerWidth={3}
                 outerMargin={10}>
      <TabPanel activeTabKey={activeTabPanelOne}
                onClickTab={(tabKey) => setActiveTabPanelOne(tabKey)}
        // onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelsFromSpecs(panelSpecs, 'one')}
      </TabPanel>
      <TabPanel activeTabKey={activeTabPanelTwo}
                onClickTab={(tabKey) => setActiveTabPanelTwo(tabKey)}
        // onClickExpand={handleOnClickTabExpand}
                shimWidth={shimWidth}>
        {panelsFromSpecs(panelSpecs, 'two')}
      </TabPanel>
    </SplitPanels>
  </div>);
}