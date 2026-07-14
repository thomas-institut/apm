import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

const BreakLabels : Record<string, string> = {
    '': 'None',
    'paragraph': 'Paragraph',
}

export class SetChunkBreakAction implements StateTransformAction<HistoryState> {
  private title: string;

  constructor(
    private readonly chunkIndex: number,
    private readonly newBreak: string,
  ) {
    this.title = `Set chunk ${this.chunkIndex} break after to '${this.newBreak}'`;
  }

  execute(state: HistoryState): HistoryState {
    const chunk = state.mceData.chunks[this.chunkIndex];
    if (!chunk) {
      throw new Error(`Chunk ${this.chunkIndex} does not exist`);
    }
    const newState = deepCopy(state);
    MceData.setChunkBreak(newState.mceData, this.chunkIndex, this.newBreak);
    this.title = `Set chunk ${chunk.chunkId}'s break after to '${BreakLabels[this.newBreak] ?? 'Unknown' }'`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}