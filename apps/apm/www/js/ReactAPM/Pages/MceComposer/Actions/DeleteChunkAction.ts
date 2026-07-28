import {MceData} from '@/MceData/MceData';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {deepCopy} from '@/toolbox/Util';

export class DeleteChunkAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;
  constructor(
    private readonly chunkPosition: number,
  ) {
    this.title = `Delete chunk`;
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const chunkOrder = state.mceData.chunkOrder;
    if (chunkOrder === undefined) {
      throw `Chunk order is undefined`;
    }
    const chunkIndex = chunkOrder[this.chunkPosition];
    const chunk = state.mceData.chunks[chunkIndex];
    if (!chunk) {
      throw `Chunk at position ${this.chunkPosition} does not exist`;
    }
    const newState = deepCopy(state);
    const chunkId = chunk.chunkId;
    MceData.deleteChunk(newState.mceData, chunkIndex);
    this.title = `Remove chunk ${chunkId} from edition`;
    return newState
  }

  description(_state: MceComposerHistoryState): string {
   return this.title;
  }
}