import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

const BreakLabels : Record<string, string> = {
    '': 'None',
    'paragraph': 'Paragraph',
}

export class SetChunkBreakAction implements StateTransformAction<MceComposerHistoryState> {
  private title: string;

  constructor(
    private readonly chunkPosition: number,
    private readonly newBreak: string,
  ) {
    this.title = `Set break for chunk at position ${this.chunkPosition + 1} to '${this.newBreak}'`;
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
    if (state.mceData.chunks[chunkIndex].break === this.newBreak) {
      // nothing to do
      return state;
    }
    const newState = deepCopy(state);
    MceData.setChunkBreak(newState.mceData, chunkIndex, this.newBreak);
    this.title = `Set break for chunk ${chunk.chunkId} (at position ${this.chunkPosition+1}) to '${BreakLabels[this.newBreak] ?? 'Unknown' }'`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}