import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AppContext} from '@/ReactAPM/App';
import {PersonEssentialData} from '@/Api/DataSchema/ApiPeople';
import {CtCellShift, CtData} from '@/CtData/CtData';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {MainTextToken} from '@/Edition/MainTextToken';
import {findCollationTableSearchMatches} from '@/EditionComposer/CollationTableSearch';
import {getPeopleMentionedInCtData} from '@/CtData/CtDataPeopleUtil';
import {toolbarCharactersDefinition} from '@/EditionComposer/ToolbarCharactersDefinition';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';
import {EditModeOff, EditModeMove, EditModeGroup} from '@/pages/common/TableEditor/TableEditor';
import {TabbableElementProps} from '@/ReactAPM/Components/PanelUI/TabPanel';
import ConfirmDialog from '@/ReactAPM/Components/ConfirmDialog';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {ApplyAutomaticNormalizationsAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ApplyAutomaticNormalizationsAction';
import {CompactCtTableAction} from '@/ReactAPM/Pages/EditionComposer/Actions/CompactCtTableAction';
import {DeleteCtColumnAction} from '@/ReactAPM/Pages/EditionComposer/Actions/DeleteCtColumnAction';
import {EditCtTokenTextAction} from '@/ReactAPM/Pages/EditionComposer/Actions/EditCtTokenTextAction';
import {InsertCtColumnAction} from '@/ReactAPM/Pages/EditionComposer/Actions/InsertCtColumnAction';
import {SetCtColumnGroupAction} from '@/ReactAPM/Pages/EditionComposer/Actions/SetCtColumnGroupAction';
import {ShiftCtCellsAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ShiftCtCellsAction';
import {CtCellHoverInfo, CtTableCellRenderer} from './CtTableCellRenderer';
import {CtPanelMode, default as CtPanelToolbar} from './CtPanelToolbar';
import {CtTableEditor} from './CtTableEditor';
import CtTokenPopover from './CtTokenPopover';
import NormalizationSettingsDialog from './NormalizationSettingsDialog';
import './CtPanel.css';
import {MainTextTokenRange} from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer';
import {isRtl} from '@/toolbox/Util';

export interface CtPanelProps extends TabbableElementProps {
  ctData: CtDataInterface;
  mainText: MainTextToken[];
  canEdit: boolean;
  normalizerRegister: NormalizerRegister;
  onAction: (action: StateTransformAction<EditionComposerHistoryState>, name: string) => Promise<boolean>;
  onEditApparatusEntry: (apparatusIndex: number, range: MainTextTokenRange) => void;
}

export default function CtPanel(props: CtPanelProps) {
  const appContext = useContext(AppContext);
  const rendererRef = useRef<CtTableCellRenderer | null>(null);
  if (rendererRef.current === null) {
    rendererRef.current = new CtTableCellRenderer(props.ctData);
  }
  const renderer = rendererRef.current;
  const [mode, setMode] = useState<CtPanelMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchMatch, setSelectedSearchMatch] = useState(-1);
  const [showPopovers, setShowPopovers] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<CtCellHoverInfo | null>(null);
  const [peopleInfo, setPeopleInfo] = useState<Record<number, PersonEssentialData>>({});
  const [selectedColumns, setSelectedColumns] = useState<[number, number] | null>(null);
  const [showCompactConfirmation, setShowCompactConfirmation] = useState(false);
  const [selectedNormalizers, setSelectedNormalizers] = useState<string[]>(() => {
    return props.ctData.automaticNormalizationsApplied.length > 0
      ? [...props.ctData.automaticNormalizationsApplied]
      : props.normalizerRegister.getRegisteredNormalizers();
  });
  const [showNormalizationSettings, setShowNormalizationSettings] = useState(false);

  const availableNormalizers = props.normalizerRegister.getRegisteredNormalizers();
  const showNormalizations = props.ctData.automaticNormalizationsApplied.length > 0;
  const textDirection = isRtl(props.ctData.lang) ? 'rtl' : 'ltr';
  const searchMatches = useMemo(() => {
    const rows = CtData.getCtRowWitnessIndexes(props.ctData).map((witnessIndex) => {
      return props.ctData.collationMatrix[witnessIndex].map((tokenIndex) => {
        if (tokenIndex === -1) {
          return '';
        }
        const token = props.ctData.witnesses[witnessIndex].tokens[tokenIndex];
        return token?.normalizedText ?? token?.text ?? '';
      });
    });
    const query = props.normalizerRegister.applyNormalizerList(
      props.ctData.automaticNormalizationsApplied,
      searchQuery
    );
    return findCollationTableSearchMatches(rows, query);
  }, [props.ctData, props.normalizerRegister, searchQuery]);
  const deletableColumnCount = CtData.getDeletableColumns(props.ctData).length;
  const toolbarCharacters = Object.values(toolbarCharactersDefinition[props.ctData.lang] ?? {});
  const peopleIdsKey = [...new Set(getPeopleMentionedInCtData(props.ctData))].join(',');

  useEffect(() => {
    let isCurrent = true;
    const peopleIds = peopleIdsKey === '' ? [] : peopleIdsKey.split(',').map((id) => Number(id));
    Promise.all(peopleIds.map(async (personId) => {
      try {
        return [personId, await appContext.apiClient.getPersonEssentialData(personId)] as const;
      } catch (error) {
        console.warn(`Could not load person ${personId} for collation table popover`, error);
        return null;
      }
    })).then((peopleResults) => {
      if (isCurrent) {
        const data: Record<number, PersonEssentialData> = {};
        peopleResults.forEach((result) => {
          if (result !== null) {
            data[result[0]] = result[1];
          }
        });
        setPeopleInfo(data);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [appContext.apiClient, peopleIdsKey]);

  useEffect(() => {
    renderer.setPeopleInfo(peopleInfo);
  }, [peopleInfo, renderer]);

  useEffect(() => {
    setSelectedSearchMatch(-1);
  }, [props.ctData, searchQuery]);

  useEffect(() => {
    const applied = props.ctData.automaticNormalizationsApplied;
    if (applied.length > 0) {
      setSelectedNormalizers([...applied]);
    }
  }, [props.ctData.automaticNormalizationsApplied]);

  const runAction = (action: StateTransformAction<EditionComposerHistoryState>) => {
    if (props.canEdit) {
      void props.onAction(action, action.description({ctData: props.ctData}));
    }
  };

  const handleSearchNavigation = (direction: -1 | 1) => {
    if (searchMatches.length === 0) {
      return;
    }
    setSelectedSearchMatch((current) => current === -1
      ? (direction === 1 ? 0 : searchMatches.length - 1)
      : (current + direction + searchMatches.length) % searchMatches.length);
  };

  const handleModeChange = (newMode: CtPanelMode) => {
    if (newMode !== 'search' && !props.canEdit) {
      return;
    }
    setMode(newMode);
  };

  const handleToggleNormalizations = (show: boolean) => {
    runAction(new ApplyAutomaticNormalizationsAction(
      show ? (selectedNormalizers.length > 0 ? selectedNormalizers : availableNormalizers) : [],
      props.normalizerRegister
    ));
  };

  const handleApplyNormalizationSettings = async (normalizers: string[]) => {
    if (!props.canEdit) {
      return;
    }
    const action = new ApplyAutomaticNormalizationsAction(normalizers, props.normalizerRegister);
    const applied = await props.onAction(action, action.description());
    if (applied) {
      setSelectedNormalizers(normalizers.length === 0 ? availableNormalizers : normalizers);
      setShowNormalizationSettings(false);
    }
  };

  const handleAddApparatusEntry = (apparatusIndex: number) => {
    if (props.ctData.type !== 'edition' || selectedColumns === null) {
      return;
    }
    const editionRow = props.ctData.collationMatrix[props.ctData.editionWitnessIndex];
    const fromTokenIndex = editionRow[selectedColumns[0]];
    const toTokenIndex = editionRow[selectedColumns[1]];
    if (fromTokenIndex === undefined || toTokenIndex === undefined || fromTokenIndex === -1 || toTokenIndex === -1) {
      return;
    }
    const from = props.mainText.findIndex((token) => token.editionWitnessTokenIndex === fromTokenIndex);
    const to = props.mainText.findIndex((token) => token.editionWitnessTokenIndex === toTokenIndex);
    if (from === -1 || to === -1) {
      return;
    }
    props.onEditApparatusEntry(apparatusIndex, {from, to});
  };

  const handleEditToken = (row: number, col: number, text: string) => {
    const witnessIndex = CtData.getCtRowWitnessIndexes(props.ctData)[row];
    if (!props.canEdit || witnessIndex === undefined) {
      return;
    }
    runAction(new EditCtTokenTextAction({
      witnessIndex,
      tokenIndex: col,
      newText: text,
      normalizerRegister: props.normalizerRegister
    }));
  };

  const editMode = !props.canEdit || mode === 'search'
    ? EditModeOff
    : mode === 'move' ? EditModeMove : EditModeGroup;
  const compactCountText = deletableColumnCount === 1
    ? 'There is one empty column. Do you want to delete it?'
    : `There are ${deletableColumnCount} empty columns. Do you want to delete them?`;

  return <div className="ct-panel" data-normalization-settings-open={showNormalizationSettings}>
    <CtPanelToolbar mode={mode} canEdit={props.canEdit} searchQuery={searchQuery}
                    searchMatches={searchMatches} selectedSearchMatch={selectedSearchMatch}
                    textDirection={textDirection} lang={props.ctData.lang}
                    showPopovers={showPopovers} showNormalizations={showNormalizations}
                    normalizationsAvailable={availableNormalizers.length > 0}
                    toolbarCharacters={toolbarCharacters}
                    csvContent={CtData.generateCsv(props.ctData)}
                    deletableColumnCount={deletableColumnCount}
                    apparatuses={props.ctData.customApparatuses}
                    hasColumnSelection={selectedColumns !== null}
                    showAddApparatusEntry={props.ctData.type === 'edition' && props.ctData.customApparatuses.length > 0}
                    onModeChange={handleModeChange}
                    onSearchQueryChange={setSearchQuery}
                    onNavigateSearch={handleSearchNavigation}
                    onTogglePopovers={(show) => {
                      setShowPopovers(show);
                      if (!show) {
                        setHoverInfo(null);
                      }
                    }}
                    onToggleNormalizations={handleToggleNormalizations}
                    onOpenNormalizationSettings={() => setShowNormalizationSettings(true)}
                    onCompact={() => setShowCompactConfirmation(true)}
                    onAddApparatusEntry={handleAddApparatusEntry}/>
    <CtTableEditor ctData={props.ctData} renderer={renderer} editMode={editMode}
                   showWitnessTitles={false} showNormalizations={false}
                   searchMatches={mode === 'search' ? searchMatches : []}
                   selectedSearchMatch={selectedSearchMatch}
                   onShiftCells={(shift: CtCellShift) => runAction(new ShiftCtCellsAction(shift))}
                   onInsertColumn={(afterCol) => runAction(new InsertCtColumnAction(afterCol))}
                   onDeleteColumn={(col) => runAction(new DeleteCtColumnAction(col))}
                   onToggleGroup={(col, grouped) => runAction(new SetCtColumnGroupAction(col, grouped))}
                   onEditToken={handleEditToken}
                   onColumnSelection={setSelectedColumns}
                   onCellHover={setHoverInfo}/>
    <CtTokenPopover info={hoverInfo} enabled={showPopovers} onClose={() => setHoverInfo(null)}/>
    <ConfirmDialog show={showCompactConfirmation} onHide={() => setShowCompactConfirmation(false)}
                   title="Compact collation table" body={compactCountText}
                   acceptButtonLabel="Delete empty columns" cancelButtonLabel="Cancel"
                   onAccept={() => runAction(new CompactCtTableAction())}/>
    <NormalizationSettingsDialog show={showNormalizationSettings} normalizerNames={availableNormalizers}
                                 selectedNormalizers={selectedNormalizers}
                                 normalizerRegister={props.normalizerRegister}
                                 onHide={() => setShowNormalizationSettings(false)}
                                 onApply={handleApplyNormalizationSettings}/>
  </div>;
}