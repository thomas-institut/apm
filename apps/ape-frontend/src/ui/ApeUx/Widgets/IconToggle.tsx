import {ReactNode} from "react";
import {ToggleOff, ToggleOn} from "react-bootstrap-icons";

interface IconToggleProps {
  onIcon?: ReactNode;
  offIcon?: ReactNode;
  on: boolean;
  onToggleChange?: (newState: boolean) => void;
}

export function IconToggle(props: IconToggleProps) {
  const onIcon = props.onIcon ?? <ToggleOn />;
  const offIcon = props.offIcon ?? <ToggleOff />;
  const onToggleChange = props.onToggleChange ?? (() => {});
  const spanStyle = {cursor: 'pointer'};
  return props.on ? <span style={spanStyle} onClick={ () => onToggleChange(false)}>{onIcon}</span> : <span style={spanStyle} onClick={ () => onToggleChange(true)}>{offIcon}</span>;
}
