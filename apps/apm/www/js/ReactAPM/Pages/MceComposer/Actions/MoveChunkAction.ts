import {MceDataInterface} from '@/MceData/MceDataInterface';
import {MceData} from '@/MceData/MceData';
import {DataEditAction} from '@/ReactAPM/ToolBox/ActionHistory/DataEditAction';

export class MoveChunkAction extends DataEditAction<MceDataInterface> {

  constructor(
    mceData: MceDataInterface,
    chunkIndex: number,
    direction: 'forwards' | 'backwards',
    onUpdate: (data: MceDataInterface) => void
  ) {
    super(
      mceData,
      onUpdate,
      (data) => { MceData.moveChunk(data, chunkIndex, direction); },
      'Move chunk',
      (oldData) => `Move chunk ${oldData.chunks[chunkIndex].chunkId} at position ${chunkIndex + 1} ${direction}`
    );
  }
}