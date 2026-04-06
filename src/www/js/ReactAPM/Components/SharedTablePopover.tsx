import React, { useEffect, useMemo, useRef, useState } from 'react';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';

type SharedTablePopoverProps = {
  getPopoverContent: (x: number, y: number) => Promise<string>;
  children: React.ReactNode;
  hoverDelayMs?: number;
  hideDelayMs?: number;
};

type ActiveCell = {
  element: HTMLElement;
  x: number;
  y: number;
};

function parseCellCoordinates(element: Element): { x: number; y: number } | null {
  for (const className of Array.from(element.classList)) {
    const match = /^cell-(\d+)-(\d+)$/.exec(className);
    if (match !== null) {
      return {
        x: Number(match[1]),
        y: Number(match[2]),
      };
    }
  }

  return null;
}

export function SharedTablePopover(props: SharedTablePopoverProps) {
  const {
    getPopoverContent,
    children,
    hoverDelayMs = 500,
    hideDelayMs = 100,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [show, setShow] = useState(false);
  const [content, setContent] = useState<string>('Loading...');
  const [loading, setLoading] = useState(false);

  const target = useMemo(() => activeCell?.element ?? null, [activeCell]);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const hidePopover = () => {
    clearHoverTimer();
    clearHideTimer();
    setShow(false);
    setActiveCell(null);
    setLoading(false);
  };

  const loadAndShowPopover = async (cell: ActiveCell) => {
    const requestId = ++requestIdRef.current;

    setActiveCell(cell);
    setContent('Loading...');
    setLoading(true);
    setShow(true);

    try {
      const html = await getPopoverContent(cell.x, cell.y);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (html.trim() === '') {
        setShow(false);
        return;
      }

      setContent(html);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setContent('<div class="text-danger">Could not load popover content.</div>');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const findCellFromEventTarget = (targetNode: EventTarget | null): ActiveCell | null => {
      if (!(targetNode instanceof Element)) {
        return null;
      }

      const cell = targetNode.closest('td');
      if (cell === null || !(cell instanceof HTMLElement)) {
        return null;
      }

      if (!container.contains(cell)) {
        return null;
      }

      const coords = parseCellCoordinates(cell);
      if (coords === null) {
        return null;
      }

      return {
        element: cell,
        x: coords.x,
        y: coords.y,
      };
    };

    const onMouseOver = (event: MouseEvent) => {
      const nextCell = findCellFromEventTarget(event.target);
      if (nextCell === null) {
        return;
      }

      const related = event.relatedTarget;
      if (related instanceof Node && nextCell.element.contains(related)) {
        return;
      }

      clearHideTimer();
      clearHoverTimer();

      hoverTimerRef.current = window.setTimeout(() => {
        void loadAndShowPopover(nextCell);
      }, hoverDelayMs);
    };

    const onMouseOut = (event: MouseEvent) => {
      const fromCell = findCellFromEventTarget(event.target);
      if (fromCell === null) {
        return;
      }

      const toElement = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (toElement !== null && fromCell.element.contains(toElement)) {
        return;
      }

      clearHoverTimer();
      clearHideTimer();

      hideTimerRef.current = window.setTimeout(() => {
        hidePopover();
      }, hideDelayMs);
    };

    const onFocusIn = (event: FocusEvent) => {
      const nextCell = findCellFromEventTarget(event.target);
      if (nextCell === null) {
        return;
      }

      clearHideTimer();
      clearHoverTimer();
      void loadAndShowPopover(nextCell);
    };

    const onFocusOut = () => {
      clearHoverTimer();
      clearHideTimer();

      hideTimerRef.current = window.setTimeout(() => {
        hidePopover();
      }, hideDelayMs);
    };

    container.addEventListener('mouseover', onMouseOver);
    container.addEventListener('mouseout', onMouseOut);
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);

    return () => {
      container.removeEventListener('mouseover', onMouseOver);
      container.removeEventListener('mouseout', onMouseOut);
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('focusout', onFocusOut);
      clearHoverTimer();
      clearHideTimer();
    };
  }, [getPopoverContent, hideDelayMs, hoverDelayMs]);

  return (
    <div ref={containerRef}>
      {children}

      <Overlay
        show={show && target !== null}
        target={target}
        placement="auto"
        container={document.body}
        transition={false}
        rootClose={false}
      >
        {(overlayProps) => (
          <Popover id="shared-table-popover" {...overlayProps}>
            <Popover.Body>
              {loading ? (
                <span>Loading...</span>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: content }} />
              )}
            </Popover.Body>
          </Popover>
        )}
      </Overlay>
    </div>
  );
}