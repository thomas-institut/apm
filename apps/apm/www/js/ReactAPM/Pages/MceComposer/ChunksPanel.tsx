import {ChunkInMceData, ValidChunkBreaks} from "@/MceData/MceDataInterface";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";
import {useEffect, useState} from "react";
import {Spinner} from "react-bootstrap";
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
import './ChunksPanel.css';

interface ChunksPanelProps extends TabbableElementProps {
  chunks: ChunkInMceData[];
  chunkOrder: number[];
  deleteChunk?: (chunkIndex: number) => boolean;
  updateChunk?: (chunkIndex: number) => void;
  moveChunk?: (chunkIndex: number, direction: 'up' | 'down') => void;
  setChunkBreak?: (chunkIndex: number, breakAfter: string) => void;
  ctDataStatusArray: CtDataStatus[];
}

type ControlButton = 'delete' | 'update';

interface ChunkTableRow {
  chunkId: string;
  moveUpArrow: boolean;
  moveDownArrow: boolean;
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
                                      setChunkBreak
                                    }: ChunksPanelProps) {

  const [pendingDeleteChunkIndex, setPendingDeleteChunkIndex] = useState<number | null>(null);

  useEffect(() => {
    setPendingDeleteChunkIndex(null);
  }, [chunks, chunkOrder, ctDataStatusArray]);


  if (chunks.length !== ctDataStatusArray.length) {
    return <div className={'text-danger'}>Chunks and CtDataStatusArray length mismatch!</div>;
  }

  const numChunks = ctDataStatusArray.length;
  if (numChunks === 0) {
    return <div>No chunks, add some in the "Add Chunks panel"</div>;
  }
  const lastChunkIndex = chunks.length - 1;

  const getChunkTableRow = (chunk: ChunkInMceData, index: number): ChunkTableRow => {
    const isFirst = index === 0;
    const isLast = index === lastChunkIndex;

    const chunkTableRow: ChunkTableRow = {
      chunkId: chunk.chunkId,
      moveUpArrow: !isFirst,
      moveDownArrow: !isLast,
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
    if (!deleteChunk || pendingDeleteChunkIndex !== null) {
      return;
    }

    setPendingDeleteChunkIndex(chunkIndex);
    const deleteSuccess = deleteChunk(chunkIndex);
    if (!deleteSuccess) {
      setPendingDeleteChunkIndex(null);
    }
  };

  const handleUpdateChunk = (chunkIndex: number) => {
    updateChunk && updateChunk(chunkIndex);
  };

  const handleMoveChunk = (chunkIndex: number, direction: 'up' | 'down') => {
    moveChunk && moveChunk(chunkIndex, direction);
  };

  const handleSetChunkBreak = (chunkIndex: number, breakAfter: string) => {
    setChunkBreak && setChunkBreak(chunkIndex, breakAfter === 'none' ? '' : breakAfter);
  };

  const chunkBreakMultiToggleOptionSpecs: MultiToggleOptionSpec[] = [
    {
      key: 'none',
      label: 'None',
      disabled: false,
    },
    ...ValidChunkBreaks.filter((breakType) => breakType !== '')
      .map((breakType) => {
        return {
          key: breakType,
          label: capitalizeFirstLetter(breakType),
          disabled: false,
        };
      })
  ];
  const columnDefs: NiceTableColumnDef<ChunkTableRow>[] = [

    {
      key: 'arrows',
      title: '',
      cellContent: (row, index) => {
        const arrowUpClasses = ['icon-btn'];
        if (!row.moveUpArrow) {
          arrowUpClasses.push('disabled');
        }
        const arrowDownClasses = ['icon-btn'];
        if (!row.moveDownArrow) {
          arrowDownClasses.push('disabled');
        }
        const getArrowTitle = (direction: 'up' | 'down') => {
          if (direction === 'up' && !row.moveUpArrow) {
            return '';
          }
          if (direction === 'down' && !row.moveDownArrow) {
            return '';
          }
          return `Click to move chunk ${row.chunkId} ${direction === 'up' ? 'one row up' : 'one row down'}`;
        };
        return <div className={'chunk-table-arrows'}>
          <ArrowUpShort className={arrowUpClasses.join(' ')} title={getArrowTitle('up')}
                   onClick={() => handleMoveChunk(index, 'up')}/>
          <ArrowDownShort className={arrowDownClasses.join(' ')} title={getArrowTitle('down')}
                     onClick={() => handleMoveChunk(index, 'down')}/>
        </div>;
      }
    },
    {
      key: 'pos',
      title: 'Pos',
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
      cellContent: (row, index) => <MultiToggle options={chunkBreakMultiToggleOptionSpecs}
                                                onChange={(breakAfter) => handleSetChunkBreak(index, breakAfter)}
                                                selected={row.breakAfter ?? 'none'}/>,
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
                if (pendingDeleteChunkIndex === index) {
                  return <Spinner key={'delete'} animation={'border'} size={'sm'}
                                  title={`Removing chunk ${row.chunkId}`}/>;
                }
                return <Trash key={'delete'} className={'icon-btn'}
                              title={`Click to remove chunk ${row.chunkId} from the edition`}
                              onClick={() => handleDeleteChunk(index)}/>;
              case 'update':
                return <ArrowClockwise key={'update'} className={'icon-btn'}
                                              title={`Click to update chunk ${row.chunkId}`}
                                              onClick={() => handleUpdateChunk(index)}/>;
              default:
                return null;
            }
          })}
        </div>;
      }
    }
  ];

  const rows = chunkOrder.map((chunkOrder) => chunks[chunkOrder])
    .map((chunk, index) => getChunkTableRow(chunk, index));

  return <div className={'chunks-panel'}>
    <NiceTable rows={rows} columnDefs={columnDefs} stickyHeader={true}/>
  </div>;
}





