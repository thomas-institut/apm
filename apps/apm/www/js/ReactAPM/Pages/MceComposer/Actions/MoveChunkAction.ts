import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class MoveChunkAction implements StateTransformAction<HistoryState> {

  private title: string;
  constructor(
    private readonly chunkPosition: number,
    private readonly direction: 'forwards' | 'backwards',
  ) {
    this.title = 'Move chunk';
  }

  execute(state: HistoryState): HistoryState {
    const newState = deepCopy(state);
    const chunkOrder = state.mceData.chunkOrder;
    if (chunkOrder === undefined) {
       throw `Chunk order is undefined`;
    }
    const chunk = state.mceData.chunks[chunkOrder[this.chunkPosition]];
    if (!chunk) {
      throw `Chunk at position ${this.chunkPosition} does not exist`;
    }
    const newPosition = this.chunkPosition + (this.direction === 'forwards' ? 1 : -1);
    this.title = `Move chunk ${chunk.chunkId} to position ${newPosition + 1}`;
    MceData.moveChunk(newState.mceData, this.chunkPosition, this.direction);
    return newState;
  }

  description(_state: HistoryState): string {
   return this.title;
  }
}