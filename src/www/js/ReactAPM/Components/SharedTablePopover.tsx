import React, {ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';

type SharedTablePopoverProps = {
  /**
   * If false, no popovers will be shown.
   */
  enabled?: boolean;
  /**
   * A function that returns a promise that resolves to the content of the popover.
   *
   * The function is called with the cell coordinates (x, y) of the cell that was hovered over.
   * If x or y is is -1, it means that the cell is a header.
   *
   * The function should return a React node that represents the content of the popover or null
   * if the popover should not be shown.
   */
  getPopoverContent: (x: number, y: number) => Promise<ReactNode>;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  /**
   * The class name used to identify table cells. Defaults to 'cell'.
   */
  cellClass?: string;
  /**
   * The infix that is used to identify header cells. Defaults to 'header'.
   */
  headerInfix?: string;
  hoverDelayMs?: number;
  hideDelayMs?: number;
};

type ActiveCell = {
  element: HTMLElement; x: number; y: number;
};

function parseCellCoordinates(element: Element, headerInfix: string): { x: number; y: number } | null {
  for (const className of Array.from(element.classList)) {
    const match = /^cell-(\d+)-(\d+)$/.exec(className);
    if (match !== null) {
      return {
        x: match[1] === headerInfix ? -1 : Number(match[1]), y: match[2] === headerInfix ? -1 : Number(match[2]),
      };
    }
  }
  return null;
}


/**
 * Adds popovers to a table based on the cell coordinates.
 *
 * Children with the class `cell` are considered table cells and the cell coordinates are identified with
 * an extra class `cell-x-y`, where `x` and `y` are the cell coordinates. A function is used to generate the content of the popover.
 *
 * Column and row headers can be identified using the word `header` instead of a number in the
 * class name. For example, `cell-header-1` (row header 1) or `cell-1-header` (column header 1).
 *
 * If the content generator function returns `null`, the popover will not be shown.
 *
 *
 *
 * The cells in
 * @param props
 * @constructor
 */
export function SharedTablePopover(props: SharedTablePopoverProps) {
  const {
    enabled= true, placement = 'bottom',
    cellClass = 'cell', headerInfix = 'header',
    getPopoverContent, children, hoverDelayMs = 200, hideDelayMs = 100,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [show, setShow] = useState(false);
  const [content, setContent] = useState<ReactNode>('Loading...');
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
      const contentNode = await getPopoverContent(cell.x, cell.y);
      if (contentNode === null) {
        setShow(false);
        return;
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      setContent(contentNode);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setContent(<div className="text-danger">Could not load popover content.</div>);
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

      const cell = targetNode.closest(`.${cellClass}`);
      if (cell === null || !(cell instanceof HTMLElement)) {
        return null;
      }

      if (!container.contains(cell)) {
        return null;
      }

      const coords = parseCellCoordinates(cell, headerInfix);
      if (coords === null) {
        return null;
      }

      return {
        element: cell, x: coords.x, y: coords.y,
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

  if (!enabled) {
    return <div ref={containerRef}>{children}</div>;
  }

  return (<div ref={containerRef}>
      {children}

      <Overlay
        key={activeCell ? `${activeCell.x}-${activeCell.y}` : 'none'}
        show={show && target !== null}
        target={target}
        placement={placement}
        container={document.body}
        transition={false}
        rootClose={false}
      >
        { (props) => (
          <Popover {...props} placement={props.placement} style={{ ...props.style,  pointerEvents: 'none' }}>
            <Popover.Body>
              {loading ? (<span>Loading...</span>) : content}
            </Popover.Body>
          </Popover>
        )}

      </Overlay>
    </div>);
}