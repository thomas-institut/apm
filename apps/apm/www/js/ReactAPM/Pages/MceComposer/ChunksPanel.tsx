import {ChunkInMceData, MceDataInterface, ValidChunkBreaks} from "@/MceData/MceDataInterface";
import {Fragment} from "react";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";
import {ArrowCounterclockwise, ArrowDown, ArrowUp, Trash} from "react-bootstrap-icons";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import MultiToggle, {MultiToggleOptionSpec} from "@/ReactAPM/Components/MultiToggle/MultiToggle";
import {capitalizeFirstLetter} from "@/toolbox/Util";


interface EditionPanelProps {
  mceData: MceDataInterface;
  deleteChunk?: (chunkIndex: number) => void;
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

interface ChunkTableColSpec {
  title: string;
  gridTemplate: string;
}

export default function ChunksPanel({
                                      mceData,
                                      ctDataStatusArray,
                                      deleteChunk,
                                      updateChunk,
                                      moveChunk,
                                      setChunkBreak
                                    }: EditionPanelProps) {

  const tableCols: ChunkTableColSpec[] = [
    {title: '', gridTemplate: 'max-content'},
    {title: 'Chunk Id', gridTemplate: 'max-content'},
    {title: 'Edition Id', gridTemplate: 'max-content'},
    {title: 'Title', gridTemplate: 'max-content'},
    {title: 'Version', gridTemplate: 'max-content'},
    {title: 'Break After', gridTemplate: 'max-content'},
    {title: '', gridTemplate: 'max-content'},
  ];

  if (mceData.chunks.length !== ctDataStatusArray.length) {
    return <div className={'text-danger'}>Chunks and CtDataStatusArray length mismatch!</div>;
  }

  const numChunks = ctDataStatusArray.length;
  if (numChunks === 0) {
    return <div>No chunks, add some in the "Add Chunks panel"</div>;
  }
  const lastChunkIndex = mceData.chunks.length - 1;

  const tableStyle = {
    display: 'grid',
    gridTemplateColumns: tableCols.map((col) => col.gridTemplate).join(' ')
  };

  const getChunkTableHeader = () => {
    return <Fragment>
      {tableCols.map((col) => <div className={'chunk-table-header'}>{col.title}</div>)}
    </Fragment>;
  };

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
    deleteChunk && deleteChunk(chunkIndex);
  };

  const handleUpdateChunk = (chunkIndex: number) => {
    updateChunk && updateChunk(chunkIndex);
  };

  const handleMoveChunk = (chunkIndex: number, direction: 'up' | 'down') => {
    moveChunk && moveChunk(chunkIndex, direction);
  };

  const handleSetChunkBreak = (chunkIndex: number, breakAfter: string) => {
    setChunkBreak && setChunkBreak(chunkIndex, breakAfter === 'none' ? '': breakAfter);
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

  const getChunkTableRowElement = (row: ChunkTableRow, index: number) => {

    const arrowUpClasses = [ 'control-button'];
    if (!row.moveUpArrow) {
      arrowUpClasses.push('disabled');
    }
    const arrowDownClasses = [ 'control-button'];
    if (!row.moveDownArrow) {
      arrowDownClasses.push('disabled');
    }

    const arrowsDiv = (<div className={'chunk-table-arrows'}>
      <ArrowUp className={arrowUpClasses.join(' ')} onClick={() => handleMoveChunk(index, 'up')}/>
      <ArrowDown className={arrowDownClasses.join(' ')} onClick={() => handleMoveChunk(index, 'down')}/>
    </div>);

    let statusDiv;

    if (row.errorMessage) {
      statusDiv = <div className={'chunk-table-error'}>{row.errorMessage}</div>;
    } else if (row.warningMessage) {
      statusDiv = <div className={'chunk-table-warning'}>{row.warningMessage}</div>;
    } else {
      // buttons
      statusDiv = <div className={'chunk-table-control-buttons'}>
        {row.buttons.map((button) => {
          switch (button) {
            case 'delete':
              return <Trash className={'control-button'} onClick={() => handleDeleteChunk(index)}/>;
            case 'update':
              return <ArrowCounterclockwise className={'control-button'} onClick={() => handleUpdateChunk(index)}/>;
            default:
              return null;
          }
        })}
      </div>;
    }

    return <Fragment key={row.chunkId}>
      {arrowsDiv}
      <div>{row.chunkId}</div>
      <EntityLink id={row.tableId ?? -1}
                  type={'singleChunkEdition'}
                  openInNewTab={true}
                  title={`Click to open chunk edition ${row.tableId} in new tab`}
                  label={row.tableId?.toString() ?? ''}/>
      <div>{row.title}</div>
      <div>{row.version === null ? '' : ApmFormats.time(row.version)}</div>
      <MultiToggle options={chunkBreakMultiToggleOptionSpecs} onChange={(breakAfter) => handleSetChunkBreak(index, breakAfter)}
                   selected={row.breakAfter ?? 'none'}/>
      {statusDiv}
    </Fragment>;
  };

  return (<div className={'chunks-panel'}>
    <div className={'chunk-table'} style={tableStyle}>
      {getChunkTableHeader()}
      {mceData.chunks
        .map((chunk, index) => getChunkTableRow(chunk, index))
        .map((row, index) => getChunkTableRowElement(row, index))}
    </div>
  </div>);
}





