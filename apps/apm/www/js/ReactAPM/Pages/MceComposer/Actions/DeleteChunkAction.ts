import {MceDataInterface} from '@/MceData/MceDataInterface';
import {MceData} from '@/MceData/MceData';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {deepCopy} from '@/toolbox/Util';

export class DeleteChunkAction implements StateTransformAction<HistoryState> {

  private title: string;
  constructor(
    private readonly chunkPosition: number,
  ) {
    this.title = `Delete chunk`;
  }

  execute(state: HistoryState): HistoryState {
    const newState = deepCopy(state);
    const chunkOrder = state.mceData.chunkOrder;
    if (chunkOrder === undefined) {
      throw `Chunk order is undefined`;
    }
    const chunkIndex = chunkOrder[this.chunkPosition];
    const chunk = state.mceData.chunks[chunkIndex];
    if (!chunk) {
      throw `Chunk at position ${this.chunkPosition} does not exist`;
    }
    const chunkId = chunk.chunkId;
    MceData.deleteChunk(newState.mceData, chunkIndex);
    newState.ctDataStatusArray = newState.ctDataStatusArray.filter(s => s.chunkInMceData.chunkId !== chunkId);
    this.title = `Remove chunk ${chunkId} from edition`;
    return newState
  }

  description(_state: HistoryState): string {
   return this.title;
  }
}