import {MceDataInterface} from "@/MceData/MceDataInterface";
import {CtDataInterface} from "@/CtData/CtDataInterface";


export type CtDataState = 'loading'|'loaded'|'error';

export interface CtDataStatus {
  ctDataId: number;
  ctData: null|CtDataInterface;
  ctDataState: CtDataState;
  errorMsg: string;
}
interface EditionPanelProps {
  mceData: MceDataInterface;
  ctDataStatusArray: CtDataStatus[];
}


export default function EditionPanel({mceData, ctDataStatusArray}: EditionPanelProps) {
  if (mceData.chunks.length !== ctDataStatusArray.length) {
    return <div className={'text-danger'}>Chunks and CtDataStatusArray length mismatch!</div>;
  }

  const numChunks = ctDataStatusArray.length;
  const loadedCtDataCount = ctDataStatusArray.filter((ctDataStatus) => ctDataStatus.ctDataState === 'loaded').length;
  const allCtDataStatusLoaded = loadedCtDataCount === numChunks;


  return <div className={'edition-panel'}>

    { !allCtDataStatusLoaded && <div className={'text-warning'}>Loading chunks... {loadedCtDataCount} of {numChunks}</div>}
    <div>
      <h1>Chunks</h1>
      { mceData.chunks.map( (chunk) => <div key={chunk.chunkId}>
        {chunk.chunkId}: CtData {chunk.chunkEditionTableId}, {ctDataStatusArray.find((ctDataStatus) => ctDataStatus.ctDataId === chunk.chunkEditionTableId)?.ctDataState}
      </div>)}
    </div>

    </div>
  ;
}