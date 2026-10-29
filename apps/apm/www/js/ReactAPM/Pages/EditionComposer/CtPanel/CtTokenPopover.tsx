import {useEffect} from 'react';
import {FloatingPortal, autoUpdate, flip, offset, shift, useFloating} from '@floating-ui/react';
import {CtCellHoverInfo} from './CtTableCellRenderer';

export interface CtTokenPopoverProps {
  info: CtCellHoverInfo | null;
  enabled: boolean;
  onClose: () => void;
}

export default function CtTokenPopover({info, enabled, onClose}: CtTokenPopoverProps) {
  const isOpen = enabled && info !== null && info.html !== '';
  const {refs, floatingStyles} = useFloating({
    open: isOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({padding: 8})],
    whileElementsMounted: autoUpdate
  });

  useEffect(() => {
    refs.setReference(info?.element ?? null);
  }, [info?.element, refs]);

  if (!isOpen || info === null) {
    return null;
  }

  return <FloatingPortal>
    <div ref={refs.setFloating} className="ct-token-popover" style={floatingStyles}
         role="tooltip" onMouseLeave={onClose} dangerouslySetInnerHTML={{__html: info.html}}/>
  </FloatingPortal>;
}