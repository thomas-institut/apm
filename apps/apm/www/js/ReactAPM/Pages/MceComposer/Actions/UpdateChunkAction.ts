import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";

export class UpdateChunkAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;

  constructor(
    private readonly tableId: number,
    private readonly singleChunkData: SingleChunkApiData,
    private readonly getDocTitle: (docId: number) => Promise<string>,
    private readonly getSourceTitle: (sourceId: number) => Promise<string>,
  ) {
    this.title = 'Update chunk';
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    await MceData.updateChunk(newState.mceData, this.tableId, this.singleChunkData.ctData, this.singleChunkData.timeStamp, this.getDocTitle, this.getSourceTitle);

    const indexInCtDataStatusArray = newState.ctDataStatusArray.findIndex((ctDataStatus) => ctDataStatus.ctDataId === this.tableId);
    if (indexInCtDataStatusArray === -1) {
      throw new Error('Chunk not in CtDataStatusArray');
    }

    const indexInMceData = newState.mceData.chunks.findIndex( (chunk) => chunk.chunkEditionTableId === this.tableId);
    if (indexInMceData === -1) {
      throw new Error('Chunk not in MceData');
    }

    newState.ctDataStatusArray[indexInCtDataStatusArray] = ({
      ctDataId: this.tableId,
      ctDataState: 'loaded',
      apiData: this.singleChunkData,
      errorMsg: '',
      chunkInMceData: newState.mceData.chunks[indexInMceData],
      lastVersionTimeStamp: this.singleChunkData.timeStamp
    });

    this.title = `Update chunk ${this.singleChunkData.ctData.chunkId} to version ${this.singleChunkData.timeStamp}`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}
