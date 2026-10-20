import {ReactNode} from "react";
import {ArrowLeftShort, ArrowRightShort, Eye, EyeSlash} from "react-bootstrap-icons";

interface SubEntryQuickControlsProps {
  enabled: boolean;
  children: ReactNode;
  isFirst: boolean;
  isLast: boolean;
  /** In right-to-left languages the arrows are mirrored */
  rtl: boolean;
  onToggle: () => void;
  onMove: (direction: 'backward' | 'forward') => void;
}

/**
 * Icons shown (via CSS) when hovering a sub-entry: enable/disable and move backward/forward.
 */
export default function SubEntryQuickControls({enabled, children, isFirst, isLast, rtl, onToggle, onMove}: SubEntryQuickControlsProps) {
  const stop = (fn: () => void) => (event: { stopPropagation: () => void, preventDefault: () => void }) => {
    event.stopPropagation();
    event.preventDefault();
    fn();
  };
  return <span className="sub-entry-controls">
    {!isFirst && <button type="button" className="quick-move-backward"
                         aria-label="Move backward" title="Move backward"
                         onClick={stop(() => onMove('backward'))}>{rtl ? <ArrowRightShort/> : <ArrowLeftShort/>}</button>}
    {children}
    <button type="button" className="quick-toggle" aria-label={enabled ? 'Disable sub-entry' : 'Enable sub-entry'}
            title={enabled ? 'Disable' : 'Enable'} onClick={stop(onToggle)}>{enabled ? <Eye/> : <EyeSlash/>}</button>
    {!isLast && <button type="button" className="quick-move-forward"
                        aria-label="Move forward" title="Move forward"
                        onClick={stop(() => onMove('forward'))}>{rtl ? <ArrowLeftShort/> : <ArrowRightShort/>}</button>}
  </span>;
}
