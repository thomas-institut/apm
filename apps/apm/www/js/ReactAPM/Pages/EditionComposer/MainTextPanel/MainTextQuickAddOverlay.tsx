import {Button, Overlay, Popover} from "react-bootstrap";
import {PencilSquare, PlusLg} from "react-bootstrap-icons";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import QuickSubEntryPopover from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickSubEntryPopover";
import {
  QuickEditOutcome,
  QuickSubEntryData
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";

interface MainTextQuickAddOverlayProps {
  /** The last selected token; the overlay is hidden if null */
  anchor: HTMLElement | null;
  /** The type of the target apparatus, or null if there is none */
  targetApparatusType: string | null;
  lemmaText: string;
  lineNumber?: number;
  sigla: string[];
  witnessOrder: number[];
  siglaGroups: SiglaGroup[];
  lang: string;
  /** The entry that already exists for the selected range in the target apparatus, if any */
  targetEntry: ApparatusEntry | null;
  onQuickAdd: (data: QuickSubEntryData) => Promise<QuickEditOutcome>;
  /** Index of the sub-entry to enable, in the existing target entry */
  onEnableExisting: (subEntryIndex: number) => Promise<QuickEditOutcome>;
  /** If not given, the "Edit entry" button is not shown */
  onEditEntry?: () => void;
}

/**
 * Floating toolbar shown next to a main text selection in apparatus mode, with the
 * quick add form and the button for the full entry editor.
 */
export default function MainTextQuickAddOverlay({anchor, targetApparatusType, lemmaText, lineNumber, sigla, witnessOrder,
                                                  siglaGroups, lang, targetEntry, onQuickAdd, onEnableExisting,
                                                  onEditEntry}: MainTextQuickAddOverlayProps) {
  const noTarget = targetApparatusType === null;

  return <Overlay target={anchor} show={anchor !== null} placement="bottom">
    <Popover id="main-text-quick-add-popover" className="main-text-quick-add-popover">
      <Popover.Header as="h3">
        {lineNumber === undefined ? '' : `Line ${lineNumber}: `}{lemmaText}
        {!noTarget && <span className="quick-add-target"> → {targetApparatusType}</span>}
      </Popover.Header>
      <Popover.Body>
        <div className="quick-add-buttons">
          <QuickSubEntryPopover triggerContent={<><PlusLg/> Quick add{noTarget ? '' : ` ${targetApparatusType}`}</>}
                                triggerSize="sm" triggerVariant="outline-secondary" triggerLabel="Quick add"
                                triggerTitle={noTarget ? 'No apparatus visible: choose a specific apparatus' : 'Quick add'}
                                disabled={noTarget} sigla={sigla} witnessOrder={witnessOrder} siglaGroups={siglaGroups}
                                lemma={lemmaText} targetEntry={targetEntry} lang={lang} onQuickAdd={onQuickAdd}
                                onEnableExisting={onEnableExisting}/>
          {onEditEntry !== undefined && <Button size="sm" variant="outline-secondary" disabled={noTarget}
                                                title="Edit entry" onClick={onEditEntry}>
            <PencilSquare/> Edit entry</Button>}
        </div>
      </Popover.Body>
    </Popover>
  </Overlay>;
}
