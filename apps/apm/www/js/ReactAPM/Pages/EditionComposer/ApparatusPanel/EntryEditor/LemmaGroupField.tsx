import {JSX} from "react";
import MultiToggle from "@/ReactAPM/Components/MultiToggle/MultiToggle";

export interface LemmaGroupFieldOption {
  key: string;
  label: JSX.Element | string;
  title?: string;
}

interface LemmaGroupFieldProps {
  label: string;
  options: LemmaGroupFieldOption[];
  selected: string;
  customText: string;
  customTextSize?: number;
  onChange: (option: string, customText: string) => void;
}

/**
 * A labelled toggle with a text input that is shown when the 'custom' option is selected
 */
export default function LemmaGroupField({label, options, selected, customText, customTextSize = 10, onChange}: LemmaGroupFieldProps) {
  return <div className="aei-field-row">
    <div className="aei-field-label">{label}</div>
    <div className="aei-field-content">
      <MultiToggle
        options={options.map(({key, label, title}) => ({
          key,
          label: <span title={title}>{label}</span>
        }))}
        selected={selected}
        onChange={(option) => onChange(option, option === 'custom' ? customText : '')}/>
      {selected === 'custom' &&
        <input type="text" className="custom-text-input" size={customTextSize} value={customText}
               aria-label={`Custom ${label.toLowerCase()}`}
               onChange={(ev) => onChange('custom', ev.target.value)}/>}
    </div>
  </div>;
}
