import {MceDataInterface} from "@/MceData/MceDataInterface";


interface EditionPanelProps {
  mceData: MceDataInterface;
}


export default function EditionPanel({mceData}: EditionPanelProps) {
  return <div>
    <div>Title: {mceData.title}</div>
    <div>Schema: {mceData.schemaVersion}</div>
    <div>
      <div>Chunks</div>
      { mceData.chunks.map( (chunk) => <div key={chunk.chunkId}>{chunk.chunkId}: CtData {chunk.chunkEditionTableId}</div>)}
    </div>
  </div>;
}