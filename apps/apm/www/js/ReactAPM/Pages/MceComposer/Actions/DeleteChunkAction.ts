import {MceDataInterface} from '@/MceData/MceDataInterface';
import {MceData} from '@/MceData/MceData';
import {CtDataStatus} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {DataEditAction} from '@/ReactAPM/ToolBox/ActionHistory/DataEditAction';

interface DeleteChunkActionData {
  mceData: MceDataInterface;
  ctDataStatusArray: CtDataStatus[];
}

export class DeleteChunkAction extends DataEditAction<DeleteChunkActionData> {

  constructor(
    data: DeleteChunkActionData,
    chunkIndex: number,
    onUpdate: (data: DeleteChunkActionData) => void
  ) {
    super(
      data,
      onUpdate,
      (d) => {
        const chunkId = d.mceData.chunks[chunkIndex].chunkId;
        const newMceData = MceData.deleteChunk(d.mceData, chunkIndex);
        const newCtDataStatusArray = d.ctDataStatusArray.filter(s => s.chunkInMceData.chunkId !== chunkId);
        d.mceData = newMceData;
        d.ctDataStatusArray = newCtDataStatusArray;
      },
      'Delete chunk',
      (oldData) => `Delete chunk ${oldData.mceData.chunks[chunkIndex].chunkId}`
    );
  }
}