import {CSSProperties} from "react";
import NiceToggle from "@/ReactAPM/Components/NiceToggle/NiceToggle";
import {ToggleOff, ToggleOn} from "react-bootstrap-icons";


interface SwitchToggleProps {
  className?: string;
  style?: CSSProperties;
  onTitle?: string;
  offTitle?: string;
  isOn: boolean;
  onClick?: (newState: boolean) => void;
}

export default function SwitchToggle(props: SwitchToggleProps) {
  return <NiceToggle
    className={props.className}
    style={props.style}
    isOn={props.isOn}
    onTitle={props.onTitle}
    offTitle={props.offTitle}
    on={<ToggleOn/>}
    off={<ToggleOff/>}
    onClick={props.onClick}/>;
}