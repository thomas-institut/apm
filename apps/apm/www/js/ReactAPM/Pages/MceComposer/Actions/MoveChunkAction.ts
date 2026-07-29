import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {InvalidDataStructureError, ValidationError} from "@/lib/Error/SystemError";

export class MoveChunkAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;
  constructor(
    private readonly chunkPosition: number,
    private readonly direction: 'forwards' | 'backwards',
  ) {
    this.title = 'Move chunk';
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const chunkOrder = state.mceData.chunkOrder;
    if (chunkOrder === undefined) {
       throw new InvalidDataStructureError(`Chunk order is undefined`);
    }
    const chunk = state.mceData.chunks[chunkOrder[this.chunkPosition]];
    if (!chunk) {
      throw new ValidationError(`Chunk at position ${this.chunkPosition} does not exist`);
    }
    const newState = deepCopy(state);
    const newPosition = this.chunkPosition + (this.direction === 'forwards' ? 1 : -1);
    MceData.moveChunk(newState.mceData, this.chunkPosition, this.direction);
    this.title = `Move chunk ${chunk.chunkId} to position ${newPosition + 1}`;
    return newState;
  }

  description(_state: MceComposerHistoryState): string {
   return this.title;
  }
}