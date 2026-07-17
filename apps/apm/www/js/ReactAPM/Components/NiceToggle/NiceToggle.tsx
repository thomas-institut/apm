import {CSSProperties, ReactNode} from 'react';
import './NiceToggle.css';

interface NiceToggleProps {
  className?: string;
  style?: CSSProperties;
  on?: ReactNode;
  off?: ReactNode;
  onTitle?: string;
  offTitle?: string;
  isOn: boolean;
  onClick?: (newState: boolean) => void;
}

export default function NiceToggle(props: NiceToggleProps) {
  const {
    className,
    style,
    on,
    off,
    onTitle = 'Click to set OFF',
    offTitle = 'Click to set ON',
    isOn,
    onClick
  } = props;

  const rootClass = className && className.trim() !== '' ? className : 'nice-toggle';
  const stateClass = isOn ? 'on' : 'off';

  const handleClick = () => {
    onClick?.(!isOn);
  };

  return <span
    className={`${rootClass} ${stateClass}`}
    style={style}
    title={isOn ? onTitle : offTitle}
    onClick={handleClick}
  >{isOn ? (on ?? 'ON') : (off ?? 'OFF')}</span>;
}
