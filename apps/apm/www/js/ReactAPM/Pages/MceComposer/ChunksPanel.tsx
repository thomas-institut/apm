import {ChunkInMceData, ValidChunkBreaks} from "@/MceData/MceDataInterface";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";
import {useEffect, useState} from "react";
import {
  ArrowClockwise,
  ArrowDownShort,
  ArrowUpShort,
  Trash
} from "react-bootstrap-icons";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import MultiToggle, {MultiToggleOptionSpec} from "@/ReactAPM/Components/MultiToggle/MultiToggle";
import {capitalizeFirstLetter} from "@/toolbox/Util";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import './ChunksPanel.css';
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";

interface ChunksPanelProps extends TabbableElementProps {
  chunks: ChunkInMceData[];
  chunkOrder: number[];
  deleteChunk?: (chunkIndex: number) => boolean;
  updateChunk?: (chunkIndex: number) => void;
  moveChunk?: (chunkIndex: number, direction: 'up' | 'down') => void;
  setChunkBreak?: (chunkIndex: number, breakAfter: string) => void;
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
}

export default function ChunksPanel({
                                      chunks,
                                      chunkOrder,
                                      ctDataStatusArray,
                                      deleteChunk,
                                      updateChunk,
                                      moveChunk,
                                      setChunkBreak,
                                      version
                                    }: ChunksPanelProps) {

  const [pendingDeleteChunkIndex, setPendingDeleteChunkIndex] = useState<number | null>(null);
  const [pendingUpdateChunkIndex, setPendingUpdateChunkIndex] = useState<number | null>(null);
  const [pendingMoveChunkIndex, setPendingMoveChunkIndex] = useState<number | null>(null);
  const [pendingSetChunkBreakIndex, setPendingSetChunkBreakIndex] = useState<number | null>(null);
  const [confirmDeleteChunkIndex, setConfirmDeleteChunkIndex] = useState<number | null>(null);

  useEffect(() => {
    setPendingDeleteChunkIndex(null);
    setPendingUpdateChunkIndex(null);
    setPendingMoveChunkIndex(null);
    setPendingSetChunkBreakIndex(null);
    setConfirmDeleteChunkIndex(null);
  }, [chunks, chunkOrder, ctDataStatusArray, version]);

  const isAnyPending = pendingDeleteChunkIndex !== null ||
    pendingUpdateChunkIndex !== null ||
    pendingMoveChunkIndex !== null ||
    pendingSetChunkBreakIndex !== null;


  if (chunks.length !== ctDataStatusArray.length) {
    return <div className={'text-danger'}>Chunks and CtDataStatusArray length mismatch!</div>;
  }

  const numChunks = ctDataStatusArray.length;
  if (numChunks === 0) {
    return <div>No chunks, add some in the "Add Chunks panel"</div>;
  }
  const lastChunkIndex = chunks.length - 1;

  const getChunkTableRow = (chunk: ChunkInMceData, chunkPosition: number): ChunkTableRow => {
    const chunkTableRow: ChunkTableRow = {
      chunkId: chunk.chunkId,
      isFirst:  chunkPosition === 0,
      isLast: chunkPosition === lastChunkIndex,
      tableId: chunk.chunkEditionTableId,
      title: chunk.title,
      version: null,
      breakAfter: chunk.break === '' ? 'none' : chunk.break,
      errorMessage: null,
      warningMessage: null,
      buttons: []
    };
    const ctDataStatus = ctDataStatusArray.find((ctDataStatus) => ctDataStatus.ctDataId === chunk.chunkEditionTableId);
    if (!ctDataStatus) {
      chunkTableRow.errorMessage = 'No data found';
      return chunkTableRow;
    }

    if (!ctDataStatus.apiData) {
      chunkTableRow.warningMessage = `${ctDataStatus.ctDataState}...`;
      return chunkTableRow;
    }

    chunkTableRow.version = ctDataStatus.apiData.timeStamp;
    chunkTableRow.buttons.push('delete');

    if (!ctDataStatus.apiData.isLatestVersion) {
      chunkTableRow.buttons.push('update');
    }
    return chunkTableRow;
  };

  const handleDeleteChunk = (chunkIndex: number) => {
    if (!deleteChunk || isAnyPending) {
      return;
    }
    setConfirmDeleteChunkIndex(chunkIndex);
  };

  const handleAcceptDeleteChunk = () => {
    if (confirmDeleteChunkIndex === null || !deleteChunk || isAnyPending) {
      return;
    }

    const chunkIndex = confirmDeleteChunkIndex;
    setConfirmDeleteChunkIndex(null);

    setPendingDeleteChunkIndex(chunkIndex);
    const deleteSuccess = deleteChunk(chunkIndex);
    if (!deleteSuccess) {
      setPendingDeleteChunkIndex(null);
    }
  };

  const handleCancelDeleteChunk = () => {
    setConfirmDeleteChunkIndex(null);
  };

  const handleUpdateChunk = (chunkIndex: number) => {
    if (!updateChunk || isAnyPending) {
      return;
    }
    setPendingUpdateChunkIndex(chunkIndex);
    updateChunk(chunkIndex);
  };

  const handleMoveChunk = (chunkIndex: number, direction: 'up' | 'down') => {
    if (!moveChunk || isAnyPending) {
      return;
    }
    setPendingMoveChunkIndex(chunkIndex);
    moveChunk(chunkIndex, direction);
  };

  const handleSetChunkBreak = (chunkIndex: number, breakAfter: string) => {
    if (!setChunkBreak || isAnyPending) {
      return;
    }
    setPendingSetChunkBreakIndex(chunkIndex);
    setChunkBreak(chunkIndex, breakAfter === 'none' ? '' : breakAfter);
  };

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
      title: 'N',
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
      cellContent: (row) => <>{row.version === null ? '' : ApmFormats.time(row.version)}</>,
    },
    {
      key: 'breakAfter',
      title: 'Break After',
      cellContent: (row, index) => <ComponentWithPending pending={pendingSetChunkBreakIndex === index} smartContainer={true} pendingTitle={`Setting break for chunk ${row.chunkId}`}>
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
                return <ComponentWithPending key={'delete'} pending={pendingDeleteChunkIndex === index} pendingTitle={`Removing chunk ${row.chunkId}`}>
                  <Trash className={'icon-btn'}
                         title={isAnyPending ? '' : `Click to remove chunk ${row.chunkId} from the edition`}
                         onClick={() => handleDeleteChunk(index)}/>
                </ComponentWithPending>
              case 'update':
                return <ComponentWithPending key={'update'} pending={pendingUpdateChunkIndex === index} pendingTitle={`Updating chunk ${row.chunkId}`}>
                  <ArrowClockwise key={'update'} className={'icon-btn'}
                                  title={`Click to update chunk ${row.chunkId}`}
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
    <NiceTable rows={rows} columnDefs={columnDefs} stickyHeader={true}/>
  </div>;
}





