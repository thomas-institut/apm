import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {SingleChunkApiData} from "@/Api/DataSchema/ApiCollationTable";

export class AddChunkAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;

  constructor(
    private readonly tableId: number,
    private readonly singleChunkData: SingleChunkApiData,
    private readonly getDocTitle: (docId: number) => Promise<string>,
    private readonly getSourceTitle: (sourceId: number) => Promise<string>,
  ) {
    this.title = 'Add chunk';
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    await MceData.addChunk(newState.mceData, this.tableId, this.singleChunkData.ctData, this.singleChunkData.timeStamp, this.getDocTitle, this.getSourceTitle);

    const indexInCtDataStatusArray = newState.ctDataStatusArray.findIndex((ctDataStatus) => ctDataStatus.ctDataId === this.tableId);
    if (indexInCtDataStatusArray !== -1) {
      throw new Error('CT data already exists');
    }

    const indexInMceData = newState.mceData.chunks.findIndex( (chunk) => chunk.chunkEditionTableId === this.tableId);

    if (indexInMceData === -1) {
      throw new Error('Chunk not properly added to MceData');
    }

    newState.ctDataStatusArray.push({
      ctDataId: this.tableId,
      chunkId: this.singleChunkData.ctData.chunkId,
      requestedVersion: this.singleChunkData.timeStamp,
      loadedVersionTimeStamp: this.singleChunkData.timeStamp,
      isLatestVersion: this.singleChunkData.isLatestVersion,
      ctDataState: 'loaded',
      errorMsg: '',
      lastVersionTimeStamp: null
    });

    this.title = `Add chunk ${this.singleChunkData.ctData.chunkId} to edition`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}
