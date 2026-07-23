import {MceData} from '@/MceData/MceData';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class AddChunkAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;

  constructor(
    private readonly tableId: number,
    private readonly ctData: CtDataInterface,
    private readonly chunkTimeString: string,
    private readonly getDocTitle: (docId: number) => Promise<string>,
    private readonly getSourceTitle: (sourceId: number) => Promise<string>,
  ) {
    this.title = 'Add chunk';
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    await MceData.addChunk(newState.mceData, this.tableId, this.ctData, this.chunkTimeString, this.getDocTitle, this.getSourceTitle);
    this.title = `Add chunk ${this.ctData.chunkId} to edition`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}
