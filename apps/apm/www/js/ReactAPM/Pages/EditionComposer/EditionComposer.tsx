import {useParams} from "react-router";
import './EditionComposer.css';
import {StatusPage} from "@/ReactAPM/Components/StatusPage/StatusPage";
import {useContext, useEffect, useMemo, useRef, useState, MouseEvent} from "react";
import {Button, Spinner} from "react-bootstrap";
import {Arrow90degLeft, Arrow90degRight, ArrowCounterclockwise, Save} from "react-bootstrap-icons";
import {AppContext} from "@/ReactAPM/App";
import {CtDataInterface, CustomApparatusEntryInterface, SiglaGroupInterface} from "@/CtData/CtDataInterface";
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
import {CtDataEditionGenerator} from "@/Edition/EditionGenerator/CtDataEditionGenerator";
import {Edition} from "@/Edition/Edition";
import {UpdateApparatusEntryAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateApparatusEntryAction";
import {QuickApparatusEditAction} from "@/ReactAPM/Pages/EditionComposer/Actions/QuickApparatusEditAction";
import {prepareQuickEdit} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditPreparation";
import {
  QuickApparatusEdit,
  QuickEditOutcome,
  QuickEntryOperation
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";
import {ApparatusPanel, EntryEditRequest} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusPanel";
import PreviewPanel from "@/ReactAPM/Components/PreviewPanel/PreviewPanel";
import {
  MainTextIndexToLineMap,
  MainTextTokenRange
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import {SelectedApparatusLemma} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusViewer";
import {MainTextApparatusEntryReference} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextApparatusPopover";
import NotLastVersionWarningButton from "@/ReactAPM/Components/NotLastVersionWarningButton";
import ArchivedEditionWarningButton from "@/ReactAPM/Components/ArchivedEditionWarningButton";
import {StateHistory, StateTransformAction} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";
import {capitalizeFirstLetter, deepCopy} from "@/toolbox/Util";
import {perfBegin, perfEnd} from "@/toolbox/PerfMeasure";
import {UpdateTitleAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateTitleAction";
import {OperationalError} from "@/lib/Error/SystemError";
import BugWarningButton from "@/ReactAPM/Components/BugWarningButton";
import SessionPanel from "@/ReactAPM/Components/SessionPanel/SessionPanel";
import WitnessesPanel, {EditionWitnessData} from "@/ReactAPM/Pages/EditionComposer/WitnessesPanel/WitnessesPanel";
import {UpdateWitnessOrderAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateWitnessOrderAction";
import {UpdateSiglumAction} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateSiglumAction";
import {
  UpdateExcludeFromAutoCriticalApparatusStatusAction
} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateExcludeFromAutoCriticalApparatusStatusAction";
import {
  UpdateIncludeInAutoMarginalFoliationStatusAction
} from "@/ReactAPM/Pages/EditionComposer/Actions/UpdateIncludeInAutoMarginalFoliationStatusAction";
import {ChangeSiglaGroupAction} from "@/ReactAPM/Pages/EditionComposer/Actions/ChangeSiglaGroupAction";
import {DeleteSiglaGroupAction} from "@/ReactAPM/Pages/EditionComposer/Actions/DeleteSiglaGroupAction";
import {createStandardNormalizerRegister} from "@/normalizers/StandardNormalizers";

type ComposerStatus = 'start' | 'loading' | 'loadingNewVersion' | 'error' | 'loaded';

const OPERATIONAL_ACTION_ERROR_TIMEOUT_MS = 5000;

const getMessageFromThrownError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error ?? 'Unknown error');
};

export interface EditionComposerHistoryState {
  ctData: CtDataInterface;
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
  const [highlightedTokenRange, setHighlightedTokenRange] = useState<MainTextTokenRange | null>(null);
  const [selectedApparatusLemmas, setSelectedApparatusLemmas] = useState<Record<string, SelectedApparatusLemma | null>>({});
  const [hoveredApparatusEntries, setHoveredApparatusEntries] = useState<MainTextApparatusEntryReference[]>([]);
  const [history, setHistory] = useState<StateHistory<EditionComposerHistoryState> | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [savedStateSignature, setSavedStateSignature] = useState<string | null>(null);
  const [foundBug, setFoundBug] = useState(false);
  const [foundBugDescription, setFoundBugDescription] = useState('');
  const [operationalActionErrorMsg, setOperationalActionErrorMsg] = useState<string | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [versionTimeStamp, setVersionTimeStamp] = useState('');
  const [expandedTab, setExpandedTab] = useState<string | null>(null);
  const [activeTabPanelOne, setActiveTabPanelOne] = useState<string|null>(null);
  const [activeTabPanelTwo, setActiveTabPanelTwo] = useState<string|null>(null);
  const [entryEditRequest, setEntryEditRequest] = useState<(EntryEditRequest & { apparatusType: string }) | null>(null);

  const appContext = useContext(AppContext);
  const normalizerRegister = useMemo(() => createStandardNormalizerRegister(ctData?.lang ?? ''), [ctData?.lang]);
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
    setHighlightedTokenRange(null);
    setSelectedApparatusLemmas({});
    setHoveredApparatusEntries([]);
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
      setActiveTabPanelOne(null);
      setActiveTabPanelTwo(null);
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

  useEffect(() => {
    // closes the measurement opened in runHistoryAction: action start to committed render
    perfEnd('composer.action.total');
  }, [historyVersion]);


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
    {operationalActionErrorMsg !== null &&
      <span className={'text-danger action-error-message'}>{operationalActionErrorMsg}</span>}
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
    perfBegin('composer.action.total');
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

  const updateApparatusEntry = (apparatusType: string, customEntry: CustomApparatusEntryInterface, lemmaText: string) =>
    runHistoryAction(new UpdateApparatusEntryAction(apparatusType, customEntry, lemmaText), 'UpdateApparatusEntryAction');

  const applyQuickApparatusEdit = async (edit: QuickApparatusEdit): Promise<QuickEditOutcome> => {
    const result = prepareQuickEdit(history.getCurrentState().ctData, edition, edit);
    if ('error' in result) {
      return result.error;
    }
    const applied = await runHistoryAction(new QuickApparatusEditAction(result.prepared), 'QuickApparatusEditAction');
    return applied ? true : 'The edit could not be applied';
  };

  const quickEditApparatusEntry = (apparatusType: string, entryIndex: number, operation: QuickEntryOperation) => {
    const apparatusIndex = edition.apparatuses.findIndex((apparatus) => apparatus.type === apparatusType);
    return applyQuickApparatusEdit({...operation, apparatusIndex, entryIndex});
  };

  const editApparatusEntryForRange = (apparatusIndex: number, range: MainTextTokenRange) => {
    const apparatus = edition.apparatuses[apparatusIndex];
    if (apparatus === undefined) {
      return;
    }
    setActiveTabPanelTwo(`apparatus-${apparatus.type}`);
    setEntryEditRequest({apparatusType: apparatus.type, range, nonce: Date.now()});
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

  const handleComposerClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && (target.closest('.lemma') || target.closest('.apparatus-tab'))) {
      return;
    }
    setSelectedApparatusLemmas({});
  };

  const archive = async (): Promise<true> => {
    console.log(`Archive requested for edition ${ctData.tableId}`);
    return true;
  };

  const activeApparatusIndex = edition.apparatuses.findIndex(apparatus =>
    `apparatus-${apparatus.type}` === activeTabPanelTwo);

  const panelSpecs: PanelSpec[] = [
    {
      panel: 'one',
      key: 'mainText',
      title: 'Main Text',
      tabDescription: 'Main text',
      tabbable: true,
      content: <MainTextPanel mainText={edition.mainText} ctData={ctData}
                              apparatuses={edition.apparatuses}
                              activeApparatusIndex={activeApparatusIndex < 0 ? 0 : activeApparatusIndex}
                              sigla={ctData.sigla} canEdit={canEdit}
                              siglaGroups={edition.siglaGroups}
                              onQuickEdit={applyQuickApparatusEdit}
                              onEditApparatusEntry={editApparatusEntryForRange}
                              highlightedTokenRange={highlightedTokenRange}
                              selectedTokenRange={selectedApparatusLemmas[activeTabPanelTwo ?? -1]?.range ?? null}
                              onHoverApparatusEntries={(entries: MainTextApparatusEntryReference[]|null) => setHoveredApparatusEntries(entries ?? [])}
                              onLineNumberingChange={onLineNumberingChange}/>
    },
    {
      panel: 'one',
      key: 'cTable',
      title: 'Collation',
      tabDescription: 'Collation table',
      tabbable: true,
      content: <CtPanel ctData={ctData} mainText={edition.mainText} canEdit={canEdit}
                        normalizerRegister={normalizerRegister} onAction={runHistoryAction}
                        onEditApparatusEntry={editApparatusEntryForRange}/>
    },
    {
      panel: 'one',
      key: 'witnesses',
      title: 'Witnesses',
      tabDescription: 'Witnesses, sigla, sigla groups',
      tabbable: true,
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

  edition.apparatuses.forEach((apparatus, index) => {
    const isLast = index === edition.apparatuses.length - 1;
    const apparatusLabel = capitalizeFirstLetter(apparatus.type);
    const apparatusKey = `apparatus-${apparatus.type}`;
    const selectedLemma = selectedApparatusLemmas[apparatusKey] ?? null;
    panelSpecs.push({
      panel: 'two',
      key: apparatusKey,
      title: apparatusLabel,
      tabDescription: `Apparatus ${apparatus.type}`,
      tabbable: true,
      tabClassName: 'apparatus-tab' + (isLast ? ' last' : ''),
      content: <ApparatusPanel apparatus={apparatus}
                               lineNumberMap={mainTextIndexToLineNumberMap}
                               sigla={ctData.sigla}
                               siglaGroups={edition.siglaGroups}
                               ctData={ctData}
                               mainText={edition.mainText}
                               canEdit={canEdit}
                               onUpdateEntry={updateApparatusEntry}
                               onQuickEdit={quickEditApparatusEntry}
                               entryEditRequest={entryEditRequest?.apparatusType === apparatus.type ? entryEditRequest : null}
                               onEntryEditRequestHandled={() => setEntryEditRequest(null)}
                               lang={ctData.lang}
                               hoveredEntryIndices={hoveredApparatusEntries.filter(entry => entry.apparatusIndex === index)
                                 .map(entry => entry.entryIndex)}
                               onHoverRange={setHighlightedTokenRange}
                               selectedLemmaIndex={selectedLemma?.entryIndex ?? null}
                               onSelectLemma={(lemma) => setSelectedApparatusLemmas(previous => ({
                                 ...previous,
                                 [apparatusKey]: lemma
                               }))}/>
    });
  });

  panelSpecs.push({
      panel: 'two',
      key: 'preview',
      title: 'Preview',
      tabDescription: 'Preview of the typeset edition',
      tabbable: true,
      content: <PreviewPanel editionKey={`edition-${id}`} edition={edition} getPdfUrl={async () => ''}/>
    }
  );

  panelSpecs.push({
    panel: 'two',
    key: 'session',
    title: 'Session',
    tabDescription: 'Session history and controls',
    tabbable: true,
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
    tabbable: true,
    tabDescription: 'Admin functions: archive, switch versions, etc',
    content: <AdminPanel tableId={ctData.tableId}
                         versionTimeStamp={versionTimeStamp}
                         versions={versions}
                         isLatestVersion={isLatestVersion ?? false}
                         archive={archive}
                         isArchived={ctData.archived}
                         archivingEnabled={isLatestVersion ?? false}
                         loadingNewVersion={composerStatus === 'loadingNewVersion'}/>
  });

  return (<div className="ec-composer" onClick={handleComposerClick}>
    <div className="header">
      <ApmLogo height={30} className={'logo'}/>
      <EditableTextField className={'title'} editingClassName={'title editing'} text={ctData.title}
                         disabled={!canEdit}
                         validator={isTitleValid}
                         onConfirm={updateTitle}/>
      <span>{ctData.chunkId}</span>
      {/* Notification area: only one element must be active, otherwise the layout will break */}
      {composerStatus !== 'loadingNewVersion' && notificationsDiv}
      {composerStatus === 'loadingNewVersion' &&
        <span className={'version-loading'}><Spinner size="sm"/> Loading data...</span>}

      {/* Right side controls */}
      <div className={'controls'}>
        {!foundBug && <>
          <Button aria-label="Undo" title={undoTitle} disabled={!canEdit || !canUndo}
                  onClick={() => {
                    const state = history.undo();
                    setDisplayedHistoryState(state);
                  }}>
            <Arrow90degLeft/>
          </Button>
          <Button aria-label="Redo" title={redoTitle} disabled={!canEdit || !canRedo}
                  onClick={() => {
                    const state = history.redo();
                    setDisplayedHistoryState(state);
                  }}>
            <Arrow90degRight/>
          </Button>
          <Button aria-label="Save" title="Save edition changes"
                  disabled={!canEdit || !hasUnsavedChanges} onClick={handleOnClickSaveButton}>
            <Save/>
          </Button>
          <Button aria-label="Reset" title="Reset to last saved version"
                  disabled={!canEdit || !hasUnsavedChanges} onClick={resetToSavedState}>
            <ArrowCounterclockwise/>
          </Button>
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