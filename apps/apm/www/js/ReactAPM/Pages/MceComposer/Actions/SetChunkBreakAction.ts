import {MceDataInterface} from '@/MceData/MceDataInterface';
import {MceData} from '@/MceData/MceData';
import {DataEditAction} from '@/ReactAPM/Pages/MceComposer/Actions/DataEditAction';

export class SetChunkBreakAction extends DataEditAction<MceDataInterface> {

  constructor(
    mceData: MceDataInterface,
    chunkIndex: number,
    newBreak: string,
    onUpdate: (data: MceDataInterface) => void
  ) {
    super(
      mceData,
      onUpdate,
      (data) => { MceData.setChunkBreak(data, chunkIndex, newBreak); },
      'Set chunk break',
      () => `Set chunk ${chunkIndex} break to '${newBreak}'`
    );
  }
}