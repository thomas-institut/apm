import {ChunkInMceData, MceDataInterface} from "@/MceData/MceDataInterface";
import {Fragment} from "react";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";
import {ArrowCounterclockwise, ArrowDown, ArrowUp, Trash} from "react-bootstrap-icons";
import {ApmFormats} from "@/pages/common/ApmFormats";


interface EditionPanelProps {
  mceData: MceDataInterface;
  deleteChunk?: (chunkIndex: number) => void;
  updateChunk?: (chunkIndex: number) => void;
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
  errorMessage: string | null;
  warningMessage: string | null;
  buttons: ControlButton[];
}

interface ChunkTableColSpec {
  title: string;
  gridTemplate: string;
}

export default function ChunksPanel({mceData, ctDataStatusArray, deleteChunk, updateChunk}: EditionPanelProps) {

  const tableCols: ChunkTableColSpec[] = [
    {title: '', gridTemplate: 'max-content'},
    {title: 'Chunk Id', gridTemplate: 'max-content'},
    {title: 'Table Id', gridTemplate: 'max-content'},
    {title: 'Title', gridTemplate: 'max-content'},
    {title: 'Version', gridTemplate: 'max-content'},
    {title: '', gridTemplate: 'max-content'},
  ];

  if (mceData.chunks.length !== ctDataStatusArray.length) {
    return <div className={'text-danger'}>Chunks and CtDataStatusArray length mismatch!</div>;
  }

  const numChunks = ctDataStatusArray.length;
  if (numChunks === 0) {
    return <div>No chunks, add some in the "Add Chunks panel"</div>;
  }

  const loadedCtDataCount = ctDataStatusArray.filter((ctDataStatus) => ctDataStatus.ctDataState === 'loaded').length;
  const allCtDataStatusLoaded = loadedCtDataCount === numChunks;
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

  const getChunkTableRowElement = (row: ChunkTableRow, index: number) => {
    const arrowsDiv = (<div className={'chunk-table-arrows'}>
      <ArrowUp className={row.moveUpArrow ? '' : 'disabled'}/>
      <ArrowDown className={row.moveDownArrow ? '' : 'disabled'}/>
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
      <div>{row.tableId}</div>
      <div>{row.title}</div>
      <div>{row.version === null ? '' : ApmFormats.time(row.version)}</div>
      {statusDiv}
    </Fragment>;
  };

  return (<div className={'chunks-panel'}>
    {!allCtDataStatusLoaded &&
      <div className={'text-warning'}>Loading chunks... {loadedCtDataCount} of {numChunks}</div>}
    <div className={'chunk-table'} style={tableStyle}>
      {getChunkTableHeader()}
      {mceData.chunks
        .map((chunk, index) => getChunkTableRow(chunk, index))
        .map((row, index) => getChunkTableRowElement(row, index))}
    </div>
  </div>);
}





