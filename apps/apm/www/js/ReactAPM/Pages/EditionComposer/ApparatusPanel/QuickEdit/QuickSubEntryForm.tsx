import {useState} from "react";
import "./QuickSubEntryForm.css";
import {Check, X} from "react-bootstrap-icons";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import WitnessSelector from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/WitnessSelector";
import {
  findIdenticalSubEntry,
  QuickSubEntryData,
  QuickSubEntryType
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";

interface QuickSubEntryFormProps {
  sigla: string[];
  witnessOrder: number[];
  siglaGroups: SiglaGroup[];
  /** The entry the sub-entry will be added to, or null if the entry does not exist yet */
  targetEntry: ApparatusEntry | null;
  lang: string;
  onConfirm: (data: QuickSubEntryData) => void;
  onCancel: () => void;
  /** Called with the index of a disabled identical sub-entry when the user chooses to enable it */
  onEnableExisting?: (subEntryIndex: number) => void;
}

/**
 * Compact inline form for adding a variant, omission or addition. Hand 0 only.
 */
export default function QuickSubEntryForm({sigla, witnessOrder, siglaGroups, targetEntry, lang, onConfirm, onCancel,
                                            onEnableExisting}: QuickSubEntryFormProps) {
  const [type, setType] = useState<QuickSubEntryType>('variant');
  const [text, setText] = useState('');
  const [witnesses, setWitnesses] = useState<number[]>([]);

  const data: QuickSubEntryData = {type, text, witnesses};
  const identicalIndex = witnesses.length === 0 || (type !== 'omission' && text.trim() === '') ? -1 :
    findIdenticalSubEntry(targetEntry, data);
  const identicalIsDisabled = identicalIndex !== -1 && !targetEntry!.subEntries[identicalIndex].enabled;
  const isValid = witnesses.length > 0 && (type === 'omission' || text.trim() !== '') && identicalIndex === -1;

  const confirm = () => {
    if (isValid) {
      onConfirm(data);
    }
  };

  return <span className={`quick-sub-entry-form text-${lang}`} onClick={(event) => event.stopPropagation()}
               onDoubleClick={(event) => event.stopPropagation()}
               onKeyDown={(event) => {
                 if (event.key === 'Enter') {
                   event.preventDefault();
                   confirm();
                 } else if (event.key === 'Escape') {
                   event.preventDefault();
                   onCancel();
                 }
               }}>
    <select aria-label="Sub-entry type" value={type}
            onChange={(event) => setType(event.currentTarget.value as QuickSubEntryType)}>
      <option value="variant">variant</option>
      <option value="omission">omission</option>
      <option value="addition">addition</option>
    </select>
    <input type="text" aria-label="Sub-entry text" value={text} disabled={type === 'omission'}
           autoFocus={true} size={12} onChange={(event) => setText(event.currentTarget.value)}/>
    <WitnessSelector sigla={sigla} witnessOrder={witnessOrder} siglaGroups={siglaGroups}
                     selected={witnesses} onChange={setWitnesses}/>
    <button type="button" className="quick-confirm" aria-label="Confirm" disabled={!isValid}
            onClick={confirm}><Check/></button>
    <button type="button" className="quick-cancel" aria-label="Cancel" onClick={onCancel}><X/></button>
    {identicalIndex !== -1 && <span className="quick-form-message text-danger">
      {identicalIsDisabled ? 'Identical to a disabled sub-entry' : 'Identical to an existing sub-entry'}
      {identicalIsDisabled && onEnableExisting !== undefined &&
        <> <a href="#" role="button" onClick={(event) => {
          event.preventDefault();
          onEnableExisting(identicalIndex);
        }}>Enable it</a></>}
    </span>}
  </span>;
}
