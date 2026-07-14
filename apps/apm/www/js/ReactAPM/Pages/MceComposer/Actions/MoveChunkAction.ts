import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class MoveChunkAction implements StateTransformAction<HistoryState> {

  private title: string;
  constructor(
    private readonly chunkIndex: number,
    private readonly direction: 'forwards' | 'backwards',
  ) {
    this.title = 'Move chunk';
  }

  execute(state: HistoryState): HistoryState {
    const newState = deepCopy(state);
    const chunk = state.mceData.chunks[this.chunkIndex];
    if (!chunk) {
      throw `Chunk ${this.chunkIndex} does not exist`;
    }

    this.title = `Move chunk ${chunk.chunkId} at position ${this.chunkIndex + 1} ${this.direction}`;


    MceData.moveChunk(newState.mceData, this.chunkIndex, this.direction);

    return newState;
  }

  description(_state: HistoryState): string {
   return this.title;
  }
}