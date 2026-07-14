import {MceDataInterface} from '@/MceData/MceDataInterface';
import {MceData} from '@/MceData/MceData';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {deepCopy} from '@/toolbox/Util';

export class DeleteChunkAction implements StateTransformAction<HistoryState> {

  private title: string;
  constructor(
    private readonly chunkIndex: number,
  ) {
    this.title = `Delete chunk`;
  }

  execute(state: HistoryState): HistoryState {
    const chunk = (state.mceData as MceDataInterface).chunks[this.chunkIndex];
    if (!chunk) {
      throw new Error('Chunk not found');
    }
    const chunkId = chunk.chunkId;
    const newState = deepCopy(state);
    MceData.deleteChunk(newState.mceData, this.chunkIndex);
    newState.ctDataStatusArray = newState.ctDataStatusArray.filter(s => s.chunkInMceData.chunkId !== chunkId);
    this.title = `Remove chunk ${chunkId} from edition`;
    return newState
  }

  description(_state: HistoryState): string {
   return this.title;
  }
}