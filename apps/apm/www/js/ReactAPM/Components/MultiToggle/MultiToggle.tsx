import {JSX} from "react";
import './MultiToggle.css';


export interface MultiToggleOptionSpec {
  label: JSX.Element | string;
  key: string;
  disabled?: boolean;
}

interface MultiToggleProps {
  options: MultiToggleOptionSpec[];
  selected?: string;
  onChange?: (key: string) => void;
  className?: string;
}

export default function MultiToggle(props: MultiToggleProps) {

  const selected = props.selected ?? props.options[0].key;
  const options = props.options;
  if (options.length === 0) {
    return null;
  }

  const className = 'multi-toggle ' + (props.className ?? '');


  return (
    <div className={className}>
      {options.map((optionSpec) => {
        const isSelected = optionSpec.key === selected;
        const optionSpanClasses: string[] = ['mt-option'];
        if (isSelected) {
          optionSpanClasses.push('mt-selected');
        }
        if (optionSpec.disabled) {
          optionSpanClasses.push('mt-disabled');
        }
        return (
          <span
            key={optionSpec.key}
            onClick={() => !optionSpec.disabled && props.onChange?.(optionSpec.key)}
            className={optionSpanClasses.join(' ')}
          >
            {optionSpec.label}
          </span>
        );
      })}
    </div>
  );
}