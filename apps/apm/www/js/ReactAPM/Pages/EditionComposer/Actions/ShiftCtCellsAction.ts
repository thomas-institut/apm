import {CtCellShift, CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class ShiftCtCellsAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly shift: CtCellShift) {
    this.shift = {...shift};
  }

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.shiftCells(newState.ctData, this.shift);
    return newState;
  }

  description(): string {
    const singularShift = this.shift.firstCol === this.shift.lastCol && (this.shift.numCols ?? 1) === 1;
    return `${singularShift ? 'Shift cell' : 'Shift cells'} ${this.shift.direction}`;
  }
}