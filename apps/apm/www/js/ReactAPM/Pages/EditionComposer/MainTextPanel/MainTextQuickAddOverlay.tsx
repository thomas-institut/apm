import {useState} from "react";
import {Button, Overlay, Popover} from "react-bootstrap";
import {PencilSquare, PlusLg} from "react-bootstrap-icons";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import QuickSubEntryForm from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickSubEntryForm";
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noTarget = targetApparatusType === null;

  const finish = async (promise: Promise<QuickEditOutcome>) => {
    const outcome = await promise;
    if (outcome === true) {
      setIsFormOpen(false);
      setError(null);
    } else {
      setError(outcome);
    }
  };

  return <Overlay target={anchor} show={anchor !== null} placement="bottom">
    <Popover id="main-text-quick-add-popover" className="main-text-quick-add-popover">
      <Popover.Header as="h3">
        {lineNumber === undefined ? '' : `Line ${lineNumber}: `}{lemmaText}
        {!noTarget && <span className="quick-add-target"> → {targetApparatusType}</span>}
      </Popover.Header>
      <Popover.Body>
        {!isFormOpen && <div className="quick-add-buttons">
          <Button size="sm" variant="outline-secondary" disabled={noTarget}
                  title={noTarget ? 'No apparatus visible: choose a specific apparatus' : 'Quick add'}
                  onClick={() => setIsFormOpen(true)}><PlusLg/> Quick add{noTarget ? '' : ` ${targetApparatusType}`}</Button>
          {onEditEntry !== undefined && <Button size="sm" variant="outline-secondary" disabled={noTarget}
                                                title="Edit entry" onClick={onEditEntry}>
            <PencilSquare/> Edit entry</Button>}
        </div>}
        {isFormOpen && !noTarget && <QuickSubEntryForm sigla={sigla} witnessOrder={witnessOrder}
                                                       siglaGroups={siglaGroups} targetEntry={targetEntry}
                                                       lang={lang}
                                                       onCancel={() => {
                                                         setIsFormOpen(false);
                                                         setError(null);
                                                       }}
                                                       onEnableExisting={(index) => finish(onEnableExisting(index))}
                                                       onConfirm={(data) => finish(onQuickAdd(data))}/>}
        {error !== null && <div className="text-danger quick-edit-error">{error}</div>}
      </Popover.Body>
    </Popover>
  </Overlay>;
}
