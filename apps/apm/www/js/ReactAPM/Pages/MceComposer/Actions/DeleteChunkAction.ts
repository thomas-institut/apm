import {UndoableAction} from '@/toolbox/ActionHistory';
import {MceDataInterface} from '@/MceData/MceDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {MceData} from "@/MceData/MceData";
import {CtDataStatus} from "@/ReactAPM/Pages/MceComposer/MceComposer";

interface DeleteChunkActionData {
  mceData: MceDataInterface;
  ctDataStatusArray: CtDataStatus[];
}

export class DeleteChunkAction implements UndoableAction {

  executionTimestamp: number = -1;
  private readonly oldData: DeleteChunkActionData;
  private readonly newData: DeleteChunkActionData;
  private readonly description: string;

  constructor(data: DeleteChunkActionData,
    chunkIndex: number,
    private onUpdate: (data: DeleteChunkActionData) => void
  ) {
    this.oldData = deepCopy(data);
    this.newData = deepCopy(data);

    // Perform deletion on newData
    const chunkId = this.newData.mceData.chunks[chunkIndex].chunkId;
    const newMceData = MceData.deleteChunk(this.newData.mceData, chunkIndex);
    const newCtDataStatusArray = this.newData.ctDataStatusArray.filter ( status => status.chunkInMceData.chunkId !== chunkId)
    this.newData.mceData = newMceData;
    this.newData.ctDataStatusArray = newCtDataStatusArray;
    this.description = `Delete chunk ${this.oldData.mceData.chunks[chunkIndex].chunkId}`;
  }

  get label() {
    return this.description;
  }

  execute() {
    this.onUpdate(this.newData);
  }

  undo() {
    this.onUpdate(this.oldData);
  }
}
