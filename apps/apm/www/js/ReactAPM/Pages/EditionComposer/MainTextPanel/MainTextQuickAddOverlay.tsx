import {useState} from "react";
import {Button, Overlay, Popover} from "react-bootstrap";
import {fromCompactFmtText} from "@thomas-inst/fmt-text";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";
import SubEntry from "@/ReactAPM/Pages/EditionComposer/SubEntry";
import {ArrowDownShort, ArrowUpShort, Eye, EyeSlash, PencilSquare, PlusLg} from "react-bootstrap-icons";
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
  /** Enables/disables a sub-entry of the existing target entry */
  onToggleSubEntry?: (subEntryIndex: number) => Promise<QuickEditOutcome>;
  /** Moves a sub-entry of the existing target entry */
  onMoveSubEntry?: (subEntryIndex: number, direction: 'backward' | 'forward') => Promise<QuickEditOutcome>;
  /** Called with true when the quick add form is shown and with false when it is closed */
  onFormOpenChange?: (isOpen: boolean) => void;
}

/**
 * Floating toolbar shown next to a main text selection in apparatus mode, with the
 * quick add form and the button for the full entry editor.
 */
export default function MainTextQuickAddOverlay({anchor, targetApparatusType, lemmaText, lineNumber, sigla, witnessOrder,
                                                  siglaGroups, lang, targetEntry, onQuickAdd, onEnableExisting,
                                                  onEditEntry, onFormOpenChange, onToggleSubEntry,
                                                  onMoveSubEntry}: MainTextQuickAddOverlayProps) {
  const noTarget = targetApparatusType === null;
  const [error, setError] = useState<string | null>(null);

  const run = async (promise: Promise<QuickEditOutcome> | undefined) => {
    const outcome = await promise;
    setError(outcome === undefined || outcome === true ? null : outcome);
  };

  const entryLemma = targetEntry === null ? lemmaText :
    (targetEntry.lemmaType === 'custom' ? targetEntry.customLemmaText : targetEntry.mainTextWords.join(' '));
  const subEntries = targetEntry?.subEntries ?? [];
  const lastIndex = subEntries.length - 1;
  const quickAddButton = <QuickSubEntryPopover triggerContent={<PlusLg/>} triggerClassName="quick-add-sub-entry"
                                               triggerLabel="Add sub-entry"
                                               triggerTitle={noTarget ? 'No apparatus visible: choose a specific apparatus' : 'Add sub-entry'}
                                               disabled={noTarget} sigla={sigla} witnessOrder={witnessOrder}
                                               siglaGroups={siglaGroups} lemma={lemmaText} targetEntry={targetEntry}
                                               lang={lang} onQuickAdd={onQuickAdd} onOpenChange={onFormOpenChange}
                                               onEnableExisting={onEnableExisting}/>;

  return <Overlay target={anchor} show={anchor !== null} placement="bottom">
    <Popover id="main-text-quick-add-popover" className="main-text-quick-add-popover">
      <Popover.Header as="h3">
        {lineNumber === undefined ? '' : `Line ${lineNumber}: `}{lemmaText}
        {!noTarget && <span className="quick-add-target"> → {targetApparatusType}</span>}
      </Popover.Header>
      <Popover.Body>
        <div className={`main-text-quick-entry text-${lang}`}>
          {targetEntry === null ? <div className="main-text-apparatus-entry-lemma">[{entryLemma}]</div> :
            <div className="main-text-apparatus-entry-lemma">
              {targetEntry.preLemma !== '' && <><FmtTextRenderer t={fromCompactFmtText(targetEntry.preLemma)}/>{' '}</>}
              [{entryLemma}]
              {targetEntry.postLemma !== '' && <>{' '}<FmtTextRenderer t={fromCompactFmtText(targetEntry.postLemma)}/></>}
            </div>}
          <table className="main-text-quick-sub-entries">
            <tbody>
            {subEntries.map((subEntry, index) => <tr key={index}>
              <td className="quick-moves">
                <Button className="quick-move-backward" aria-label="Move up" title="Move up"
                        disabled={index === 0} onClick={() => run(onMoveSubEntry?.(index, 'backward'))}><ArrowUpShort/></Button>
                <Button className="quick-move-forward" aria-label="Move down" title="Move down"
                        disabled={index === lastIndex} onClick={() => run(onMoveSubEntry?.(index, 'forward'))}><ArrowDownShort/></Button>
              </td>
              <td className="quick-sub-entry">
                <SubEntry subEntry={subEntry} subEntryIndex={index} sigla={sigla} lang={lang}
                          siglaGroups={siglaGroups}/>
              </td>
              <td className="quick-controls">
                <Button className="quick-toggle" aria-label={subEntry.enabled ? 'Disable sub-entry' : 'Enable sub-entry'}
                        title={subEntry.enabled ? 'Disable' : 'Enable'}
                        onClick={() => run(onToggleSubEntry?.(index))}>{subEntry.enabled ? <Eye/> : <EyeSlash/>}</Button>
              </td>
            </tr>)}
            <tr>
              <td/>
              <td>{quickAddButton}</td>
              <td/>
            </tr>
            </tbody>
          </table>
          {error !== null && <div className="text-danger quick-edit-error">{error}</div>}
        </div>
        {onEditEntry !== undefined && <div className="quick-add-buttons">
          <Button size="sm" variant="outline-secondary" disabled={noTarget} title={targetEntry === null ? 'Edit new entry' : 'Edit entry'}
                  onClick={onEditEntry}>
            <PencilSquare/> {targetEntry === null ? 'Edit New Entry' : 'Edit Entry'}</Button>
        </div>}
      </Popover.Body>
    </Popover>
  </Overlay>;
}
