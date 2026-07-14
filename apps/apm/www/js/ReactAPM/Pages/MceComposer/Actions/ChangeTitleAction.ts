import {MceDataInterface} from '@/MceData/MceDataInterface';
import {MceData} from '@/MceData/MceData';
import {DataEditAction} from '@/ReactAPM/ToolBox/ActionHistory/DataEditAction';

export class ChangeTitleAction extends DataEditAction<MceDataInterface> {

  constructor(
    mceData: MceDataInterface,
    newTitle: string,
    onUpdate: (data: MceDataInterface) => void
  ) {
    super(
      mceData,
      onUpdate,
      (data) => { MceData.setTitle(data, newTitle); },
      'Change title',
      (_oldData, newData) => `Change title to "${newData.title}"`
    );
  }
}