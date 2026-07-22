import {MceData} from '@/MceData/MceData';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class AddChunkAction implements StateTransformAction<HistoryState> {

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

  execute(state: HistoryState): HistoryState {
    const newState = deepCopy(state);
    void MceData.addChunk(newState.mceData, this.tableId, this.ctData, this.chunkTimeString, this.getDocTitle, this.getSourceTitle);
    this.title = `Add chunk ${this.ctData.chunkId} to edition`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}
