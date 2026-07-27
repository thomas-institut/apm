import {ChunkInMceData, ValidChunkBreaks} from "@/MceData/MceDataInterface";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";
import {useEffect, useMemo, useState} from "react";
import {ArrowClockwise, ArrowDownShort, ArrowUpShort, Trash} from "react-bootstrap-icons";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import MultiToggle, {MultiToggleOptionSpec} from "@/ReactAPM/Components/MultiToggle/MultiToggle";
import {capitalizeFirstLetter} from "@/toolbox/Util";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import './ChunksPanel.css';
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {Button, Spinner} from "react-bootstrap";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";

interface ChunksPanelProps extends TabbableElementProps {
  chunks: ChunkInMceData[];
  chunkOrder: number[];
  deleteChunk?: (chunkIndex: number) => boolean | Promise<boolean>;
  updateChunk?: (chunkIndex: number) => Promise<true|string>;
  /**
   * Move a chunk up or down in the list.
   * @param chunkIndex The index of the chunk to move.
   * @param direction The direction to move the chunk.
   * @returns True if the chunk was moved, false if it was not.
   */
  moveChunk?: (chunkIndex: number, direction: 'up' | 'down') => boolean | Promise<boolean>;
  setChunkBreak?: (chunkIndex: number, breakAfter: string) => boolean | Promise<boolean>;
  checkForChunkUpdates?: () => Promise<void>;
  ctDataStatusArray: CtDataStatus[];
  /**
   * A version number that is incremented whenever the panel needs to be redrawn.
   */
  version?: number;
}

type ControlButton = 'delete' | 'update';

interface ChunkTableRow {
  chunkId: string;
  isFirst: boolean;
  isLast: boolean;
  tableId: number | null;
  title: string | null;
  version: string | null;
  breakAfter: string;
  errorMessage: string | null;
  warningMessage: string | null;
  buttons: ControlButton[];
  lastVersionTimeStamp: string|null;
}

export default function ChunksPanel({
                                      chunks,
                                      chunkOrder,
                                      ctDataStatusArray,
                                      deleteChunk,
                                      updateChunk,
                                      moveChunk,
                                      setChunkBreak,
                                      checkForChunkUpdates,
                                      version,
                                      active
                                    }: ChunksPanelProps) {
  const highlightAnimationDurationMs = 1600;
  const isPanelActive = active ?? true;

  const [pendingDeleteChunkIndex, setPendingDeleteChunkIndex] = useState<number | null>(null);
  const [pendingUpdateChunkIndex, setPendingUpdateChunkIndex] = useState<number | null>(null);
  const [pendingMoveChunkIndex, setPendingMoveChunkIndex] = useState<number | null>(null);
  const [pendingSetChunkBreakIndex, setPendingSetChunkBreakIndex] = useState<number | null>(null);
  const [confirmDeleteChunkIndex, setConfirmDeleteChunkIndex] = useState<number | null>(null);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [pendingHighlightChunkId, setPendingHighlightChunkId] = useState<string | null>(null);
  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
  const [lastCheckForUpdates, setLastCheckForUpdates] = useState<Date|null>(null);
  const [_refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRefreshTick(t => t + 1);
  }, [version]);


  useEffect(() => {
    setPendingDeleteChunkIndex(null);
    setPendingUpdateChunkIndex(null);
    setPendingMoveChunkIndex(null);
    setPendingSetChunkBreakIndex(null);
    setConfirmDeleteChunkIndex(null);
  }, [chunks, chunkOrder, ctDataStatusArray, version]);

  useEffect(() => {
    setHighlightedChunkId(null);
    setPendingHighlightChunkId(null);
  }, [version]);

  useEffect(() => {
    if (!isPanelActive || pendingHighlightChunkId === null) {
      return;
    }
    setHighlightedChunkId(pendingHighlightChunkId);
    setPendingHighlightChunkId(null);
  }, [isPanelActive, pendingHighlightChunkId]);

  useEffect(() => {
    if (highlightedChunkId === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedChunkId(null);
    }, highlightAnimationDurationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [highlightedChunkId]);

  const isAnyPending = pendingDeleteChunkIndex !== null ||
    pendingUpdateChunkIndex !== null ||
    pendingMoveChunkIndex !== null ||
    pendingSetChunkBreakIndex !== null;


  if (chunks.length === 0) {
    return <div>No chunks, add some in the "Add Chunks panel"</div>;
  }
  const lastChunkIndex = chunks.length - 1;

  const ctDataStatusById = useMemo(() => {
    return new Map(ctDataStatusArray.map((status) => [status.ctDataId, status]));
  }, [ctDataStatusArray]);

  const getChunkTableRow = (chunk: ChunkInMceData, chunkPosition: number): ChunkTableRow => {
    const chunkTableRow: ChunkTableRow = {
      chunkId: chunk.chunkId,
      isFirst: chunkPosition === 0,
      isLast: chunkPosition === lastChunkIndex,
      tableId: chunk.chunkEditionTableId,
      title: chunk.title,
      version: null,
      breakAfter: chunk.break === '' ? 'none' : chunk.break,
      errorMessage: null,
      warningMessage: null,
      buttons: [],
      lastVersionTimeStamp: null,
    };
    const ctDataStatus = ctDataStatusById.get(chunk.chunkEditionTableId);
    if (!ctDataStatus) {
      chunkTableRow.errorMessage = 'No data found';
      return chunkTableRow;
    }

    if (ctDataStatus.ctDataState !== 'loaded') {
      chunkTableRow.warningMessage = `${ctDataStatus.ctDataState}...`;
      return chunkTableRow;
    }

    if (ctDataStatus.loadedVersionTimeStamp === null) {
      chunkTableRow.warningMessage = 'loaded...';
      return chunkTableRow;
    }

    chunkTableRow.version = ctDataStatus.loadedVersionTimeStamp;
    chunkTableRow.lastVersionTimeStamp = ctDataStatus.lastVersionTimeStamp;
    chunkTableRow.buttons.push('delete');

    if (ctDataStatus.isLatestVersion === false) {
      chunkTableRow.buttons.push('update');
    }
    return chunkTableRow;
  };

  const handleDeleteChunk = (chunkIndex: number) => {
    setHighlightedChunkId(null);
    setPendingHighlightChunkId(null);
    if (!deleteChunk || isAnyPending) {
      return;
    }
    setConfirmDeleteChunkIndex(chunkIndex);
  };

  const handleAcceptDeleteChunk = async () => {
    if (confirmDeleteChunkIndex === null || !deleteChunk || isAnyPending) {
      return;
    }

    const chunkIndex = confirmDeleteChunkIndex;
    setConfirmDeleteChunkIndex(null);

    setPendingDeleteChunkIndex(chunkIndex);
    await nextTick();
    await deleteChunk(chunkIndex);
    await nextTick();
    setPendingDeleteChunkIndex(null);
  };

  const handleCancelDeleteChunk = () => {
    setConfirmDeleteChunkIndex(null);
  };

  const handleUpdateChunk = async (chunkIndex: number) => {
    setHighlightedChunkId(null);
    setPendingHighlightChunkId(null);
    if (!updateChunk || isAnyPending) {
      return;
    }
    setPendingUpdateChunkIndex(chunkIndex);
    await nextTick();
    await updateChunk(chunkIndex);
    await nextTick();
    setPendingUpdateChunkIndex(null);
  };

  const handleMoveChunk = async (chunkIndex: number, direction: 'up' | 'down') => {
    if (!moveChunk || isAnyPending) {
      return;
    }
    setHighlightedChunkId(null);
    setPendingHighlightChunkId(chunks[chunkOrder[chunkIndex]].chunkId);
    setPendingMoveChunkIndex(chunkIndex);
    await nextTick();
    const result = await moveChunk(chunkIndex, direction);
    await nextTick();
    if (!result){
      setPendingHighlightChunkId(null);
      setHighlightedChunkId(null);
    }
    setPendingMoveChunkIndex(null);
  };

  const handleSetChunkBreak = async (chunkIndex: number, breakAfter: string) => {
    setHighlightedChunkId(null);
    setPendingHighlightChunkId(null);
    if (!setChunkBreak || isAnyPending) {
      return;
    }
    setPendingSetChunkBreakIndex(chunkIndex);
    await nextTick();
    await setChunkBreak(chunkIndex, breakAfter === 'none' ? '' : breakAfter);
    await nextTick();
    setPendingSetChunkBreakIndex(null);
  };

  const handleOnClickCheckForUpdates = async () => {
    if (checkForChunkUpdates !== undefined) {
      setCheckingForUpdates(true);
      await nextTick();
      await checkForChunkUpdates();
      setLastCheckForUpdates(new Date());
      setCheckingForUpdates(false);
    }
  }

  const chunkBreakMultiToggleOptionSpecs: MultiToggleOptionSpec[] = [
    {
      key: 'none',
      label: 'None',
      disabled: isAnyPending,
    },
    ...ValidChunkBreaks.filter((breakType) => breakType !== '')
      .map((breakType) => {
        return {
          key: breakType,
          label: capitalizeFirstLetter(breakType),
          disabled: isAnyPending,
        };
      })
  ];
  const columnDefs: NiceTableColumnDef<ChunkTableRow>[] = [

    {
      key: 'n',
      title: '#',

      cellContent: (_row, index) => <>{index + 1}</>
    },
    {
      key: 'chunkId',
      title: 'Chunk Id',
      cellContent: (row) => <>{row.chunkId}</>,
    },

    {
      key: 'tableId',
      title: 'Table Id',
      cellContent: (row) => <EntityLink id={row.tableId ?? -1}
                                        type={'singleChunkEdition'}
                                        openInNewTab={true}
                                        title={`Click to open chunk edition ${row.tableId} in new tab`}
                                        label={row.tableId?.toString() ?? ''}/>,
    },
    {
      key: 'title',
      title: 'Title',
      cellContent: (row) => <>{row.title}</>,
    },
    {
      key: 'version',
      title: 'Version',
      tdClassName: 'version',
      cellContent: (row) => <>{row.version === null ? '' : ApmFormats.time(row.version)}</>,
    },
    {
      key: 'breakAfter',
      title: 'Break After',
      cellContent: (row, index) => <ComponentWithPending pending={pendingSetChunkBreakIndex === index}
                                                         smartContainer={true}
                                                         pendingTitle={`Setting break for chunk ${row.chunkId}`}>
        <MultiToggle options={chunkBreakMultiToggleOptionSpecs}
                     className={row.isLast ? 'grayed-out' : ''}
                     onChange={(breakAfter) => handleSetChunkBreak(index, breakAfter)}
                     selected={row.breakAfter ?? 'none'}/>
      </ComponentWithPending>,
    },
    {
      key: 'arrows',
      title: '',
      cellContent: (row, index) => {
        const arrowUpClasses = ['icon-btn'];
        if (row.isFirst) {
          arrowUpClasses.push('disabled');
        }
        const arrowDownClasses = ['icon-btn'];
        if (row.isLast) {
          arrowDownClasses.push('disabled');
        }
        const getArrowTitle = (direction: 'up' | 'down') => {
          if (direction === 'up' && row.isFirst) {
            return '';
          }
          if (direction === 'down' && row.isLast) {
            return '';
          }
          return `Click to move chunk ${row.chunkId} ${direction === 'up' ? 'one row up' : 'one row down'}`;
        };
        return <div className={'chunk-table-arrows'}>
          <ComponentWithPending pending={pendingMoveChunkIndex === index} pendingTitle={`Moving chunk ${row.chunkId}`}>
            <ArrowUpShort className={arrowUpClasses.join(' ')} title={getArrowTitle('up')}
                          onClick={() => handleMoveChunk(index, 'up')}/>
            <ArrowDownShort className={arrowDownClasses.join(' ')} title={getArrowTitle('down')}
                            onClick={() => handleMoveChunk(index, 'down')}/>
          </ComponentWithPending>
        </div>;
      }
    },
    {
      key: 'status',
      title: '',
      cellContent: (row, index) => {

        if (row.errorMessage) {
          return <span className={'chunk-table-error'}>{row.errorMessage}</span>;
        }
        if (row.warningMessage) {
          return <span className={'chunk-table-warning'}>{row.warningMessage}</span>;
        }
        // buttons
        return <div className={'chunk-table-control-buttons'}>
          {row.buttons.map((button) => {
            switch (button) {
              case 'delete':
                return <ComponentWithPending key={'delete'} pending={pendingDeleteChunkIndex === index}
                                             pendingTitle={`Removing chunk ${row.chunkId}`}>
                  <Trash className={'icon-btn'}
                         title={isAnyPending ? '' : `Click to remove chunk ${row.chunkId} from the edition`}
                         onClick={() => handleDeleteChunk(index)}/>
                </ComponentWithPending>;
              case 'update':
                return <ComponentWithPending key={'update'} pending={pendingUpdateChunkIndex === index}
                                             pendingTitle={`Updating chunk ${row.chunkId}`}>
                  <ArrowClockwise key={'update'} className={'icon-btn'}
                                  title={`Click to update chunk ${row.chunkId} to ${row.lastVersionTimeStamp == null ? 'latest version' : ApmFormats.time(row.lastVersionTimeStamp)}`}
                                  onClick={() => handleUpdateChunk(index)}/>
                </ComponentWithPending>;
              default:
                return null;
            }
          })}
        </div>;
      }
    },

  ];

  const rows = chunkOrder.map((chunkOrder) => chunks[chunkOrder])
    .map((chunk, chunkPosition) => getChunkTableRow(chunk, chunkPosition));

  const confirmDeleteChunkId = confirmDeleteChunkIndex !== null ? rows[confirmDeleteChunkIndex]?.chunkId : null;
  const highlightedRow = highlightedChunkId === null ? null : rows.findIndex(row => row.chunkId === highlightedChunkId);

  return <div className={'chunks-panel'}>
    <ConfirmDialog
      show={confirmDeleteChunkIndex !== null}
      onHide={handleCancelDeleteChunk}
      onCancel={handleCancelDeleteChunk}
      onAccept={handleAcceptDeleteChunk}
      title={'Remove chunk?'}
      body={<>{`Are you sure you want to remove chunk ${confirmDeleteChunkId ?? ''} from the edition?`}</>}
      acceptButtonLabel={'Remove'}
      cancelButtonLabel={'Cancel'}
      size={'sm'}
    />
    <NiceTable rows={rows} columnDefs={columnDefs} stickyHeader={true}
               getRowKey={(row) => `${row.tableId ?? 'no-table'}-${row.chunkId}`}
               highlightedRow={highlightedRow}/>
    <ComponentWithPending pending={checkingForUpdates} pendingElement={
      <div className={'check-for-updates'}>Checking for updates...<Spinner size={'sm'}/></div>}>
      <div className={'check-for-updates'}>
        <span>Last check for updates: {lastCheckForUpdates === null ? 'Never' : `${ApmFormats.time(lastCheckForUpdates)} (${ApmFormats.timeAgo(lastCheckForUpdates)})`}</span>
        <Button variant={'outline-secondary'} size={'sm'} onClick={handleOnClickCheckForUpdates}>
          Check now
        </Button>
      </div>
    </ComponentWithPending>
  </div>;
}





