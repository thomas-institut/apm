import {StateTransformAction} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";
import {EditionComposerHistoryState} from "@/ReactAPM/Pages/EditionComposer/EditionComposer";
import {deepCopy} from "@/toolbox/Util";
import {CtData} from "@/CtData/CtData";
import {ValidationError} from "@/lib/Error/SystemError";


export class UpdateTitleAction implements StateTransformAction<EditionComposerHistoryState> {

  private readonly title: string;

  constructor(private newTitle: string) {
    this.title = `Update title to '${this.newTitle}'`;
  }

  description(): string {
    return this.title;
  }

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    // check title before copying state
    if (this.newTitle === state.ctData.title) {
      return state;
    }
    if (this.newTitle.trim() === '') {
      throw new ValidationError("Edition title cannot be empty");
    }

    const newState = deepCopy(state);
    newState.ctData = CtData.updateTitle(newState.ctData, this.newTitle);
    return newState;
  }

}