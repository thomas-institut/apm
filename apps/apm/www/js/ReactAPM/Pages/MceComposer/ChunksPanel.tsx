import {ChunkInMceData, MceDataInterface} from "@/MceData/MceDataInterface";
import {Fragment} from "react";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";


interface EditionPanelProps {
  mceData: MceDataInterface;
  ctDataStatusArray: CtDataStatus[];
}

export default function ChunksPanel({mceData, ctDataStatusArray}: EditionPanelProps) {
  if (mceData.chunks.length !== ctDataStatusArray.length) {
    return <div className={'text-danger'}>Chunks and CtDataStatusArray length mismatch!</div>;
  }

  const numChunks = ctDataStatusArray.length;
  const loadedCtDataCount = ctDataStatusArray.filter((ctDataStatus) => ctDataStatus.ctDataState === 'loaded').length;
  const allCtDataStatusLoaded = loadedCtDataCount === numChunks;

  const getChunkRow = (chunk: ChunkInMceData) => {
    const ctDataStatus = ctDataStatusArray.find((ctDataStatus) => ctDataStatus.ctDataId === chunk.chunkEditionTableId);
    if (!ctDataStatus) {
      return <Fragment key={chunk.chunkId}>
        <div>{chunk.chunkId}</div>
        <div></div>
        <div></div>
        <div className={'text-danger'}>CtDataStatus not found</div>
      </Fragment>;
    }

    if (!ctDataStatus.apiData) {
      return <Fragment key={chunk.chunkId}>
        <div>{chunk.chunkId}</div>
        <div>{ctDataStatus.ctDataId}</div>
        <div></div>
        <div></div>
        <div className={'text-warning'}>{ctDataStatus.ctDataState}</div>
      </Fragment>;
    }

    const ctData = ctDataStatus.apiData.ctData;
    const apiResponse = ctDataStatus.apiData;

    return <Fragment key={chunk.chunkId}>
      <div>{chunk.chunkId}</div>
      <div>{ctDataStatus.ctDataId}</div>
      <div>{ctData.title}</div>
      <div>{ApmFormats.time(apiResponse.timeStamp)}</div>
      <div></div>
    </Fragment>;
  }

  return (<div className={'chunks-panel'}>

      {!allCtDataStatusLoaded &&
        <div className={'text-warning'}>Loading chunks... {loadedCtDataCount} of {numChunks}</div>}
      <div className={'chunk-table'}>
        <div className={'chunk-table-header'}>Chunk</div>
        <div className={'chunk-table-header'}>Table</div>
        <div className={'chunk-table-header'}>Title</div>
        <div className={'chunk-table-header'}>Version</div>
        <div className={'chunk-table-header'}></div>
        {mceData.chunks.map((chunk) => getChunkRow(chunk))}
      </div>
  </div>);
}