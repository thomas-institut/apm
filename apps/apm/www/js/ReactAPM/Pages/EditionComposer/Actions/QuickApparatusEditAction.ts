import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {
  CtRange,
  customEntryFromApparatusEntry,
  getNaturalAutoSubEntryHashes,
  normalizeCustomEntry
} from '@/Edition/ApparatusEntryCustomization';

export interface QuickApparatusEditActionParams {
  apparatusType: string;
  ctRange: CtRange;
  /** The edited entry, as it must be after the action */
  newEntry: ApparatusEntry;
  /**
   * The entry as it was displayed before the edit. It is used to normalize the stored customization
   * (customizations equal to the default are not stored) when the entry has no recorded natural order.
   */
  originalEntry?: ApparatusEntry;
  /** Text for the history, e.g. "Disable sub-entry in 'lemma'" */
  description: string;
}

/**
 * Replaces the custom entry of one collation table range with the one that reproduces an edited
 * (displayed) apparatus entry. It is the single history action behind all the quick apparatus edits.
 */
export class QuickApparatusEditAction implements StateTransformAction<EditionComposerHistoryState> {

  constructor(private readonly params: QuickApparatusEditActionParams) {
  }

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    const customEntry = normalizeCustomEntry(
      customEntryFromApparatusEntry(this.params.newEntry, this.params.ctRange),
      getNaturalAutoSubEntryHashes(this.params.newEntry, this.params.originalEntry)
    );
    newState.ctData = CtData.updateCustomApparatuses(newState.ctData, this.params.apparatusType, customEntry);
    return newState;
  }

  description(): string {
    return this.params.description;
  }
}
