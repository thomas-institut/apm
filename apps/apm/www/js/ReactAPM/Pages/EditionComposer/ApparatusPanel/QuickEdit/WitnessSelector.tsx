import {useState} from "react";
import {Button} from "react-bootstrap";
import {SiglaGroup} from "@/Edition/SiglaGroup";

interface WitnessSelectorProps {
  sigla: string[];
  /** Witness indices in the order they must be listed */
  witnessOrder: number[];
  siglaGroups: SiglaGroup[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

/**
 * Compact dropdown to select witnesses (hand 0 only). Sigla groups are listed after
 * the individual sigla as a shortcut to select all their witnesses.
 */
export default function WitnessSelector({sigla, witnessOrder, siglaGroups, selected, onChange}: WitnessSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleWitness = (witnessIndex: number) => {
    onChange(selected.includes(witnessIndex) ? selected.filter((w) => w !== witnessIndex) : [...selected, witnessIndex]);
  };

  const toggleGroup = (group: SiglaGroup) => {
    const allSelected = group.witnesses.every((w) => selected.includes(w));
    if (allSelected) {
      onChange(selected.filter((w) => !group.witnesses.includes(w)));
    } else {
      onChange([...new Set([...selected, ...group.witnesses])]);
    }
  };

  const orderedSelected = witnessOrder.filter((w) => selected.includes(w));
  const summary = orderedSelected.length === 0 ? 'Witnesses' : orderedSelected.map((w) => sigla[w]).join('');

  return <span className="quick-witness-selector">
    <Button className="quick-witness-toggle" aria-expanded={open}
            aria-label="Select witnesses" onClick={() => setOpen(!open)}>{summary} ▾
    </Button>
    {open && <div className="quick-witness-list" role="group" aria-label="Witnesses">
      {witnessOrder.map((witnessIndex) => <label key={`w-${witnessIndex}`} className="quick-witness-item">
        <input type="checkbox" checked={selected.includes(witnessIndex)}
               onChange={() => toggleWitness(witnessIndex)}/> {sigla[witnessIndex]}
      </label>)}
      {siglaGroups.length > 0 && <hr/>}
      {siglaGroups.map((group, groupIndex) => {
        const count = group.witnesses.filter((w) => selected.includes(w)).length;
        const allSelected = group.witnesses.length > 0 && count === group.witnesses.length;
        return <label key={`g-${groupIndex}`} className="quick-witness-item quick-witness-group">
          <input type="checkbox" checked={allSelected}
                 ref={(el) => {
                   if (el !== null) {
                     el.indeterminate = count > 0 && !allSelected;
                   }
                 }}
                 onChange={() => toggleGroup(group)}/> {group.siglum}
        </label>;
      })}
    </div>}
  </span>;
}
