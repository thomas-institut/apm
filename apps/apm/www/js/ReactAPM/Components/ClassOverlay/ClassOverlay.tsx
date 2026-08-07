import React, {MouseEvent, ReactNode, useEffect, useRef, useState} from "react";
import {autoUpdate, flip, offset, shift, useFloating} from "@floating-ui/react";


type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end';

interface ClassOverlayProps {
  /**
   * The class that identifies that an element can have an overlay
   *
   * Defaults to 'overlay'
   */
  baseClassName?: string;
  /**
   * The prefix of the class that identifies the id passed to the getOverlayContent function
   *
   * If not given, defaults to baseClassName + '-'
   */
  idClassPrefix?: string;
  children?: ReactNode;
  /**
   * Distance to offset the overlay from the reference element
   */
  overlayOffset?: number;
  /**
   * Placement of the overlay relative to the reference element
   *
   * Defaults to 'bottom'
   */
  placement?: Placement;
  /**
   * Event that displays the overlay
   *
   * Defaults to 'click'
   */
  trigger?: 'click' | 'hover';
  /**
   * Delay in milliseconds before a hovered reference displays its overlay
   *
   * Defaults to 500
   */
  hoverDelay?: number;

  /**
   * Whether the overlay is enabled
   *
   * Defaults to true
   */
  enabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  getOverlayContent?: (id: string | null) => ReactNode | Promise<ReactNode>;
}


export default function ClassOverlay({
                                       children,
                                       enabled = true,
                                       getOverlayContent,
                                       baseClassName = 'overlay',
                                       placement = 'bottom',
                                       idClassPrefix,
                                       overlayOffset = 5,
                                       trigger = 'click',
                                       hoverDelay = 500,
                                       className = '',
                                       style = {},
                                     }: ClassOverlayProps) {

  if (idClassPrefix === undefined) {
    idClassPrefix = baseClassName + '-';
  }
  const [refElement, setRefElement] = React.useState<HTMLElement | null>(null);
  const [overlayElement, setOverlayElement] = React.useState<HTMLElement | null>(null);
  const [isShown, setIsShown] = useState(false);
  const [id, setId] = useState<string | null>('default');

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const overlayContent = useRef<ReactNode>(null);

  const floatingData = useFloating({
    placement: placement,
    middleware: [offset(overlayOffset), flip(), shift()],
    elements: {
      reference: refElement,
      floating: overlayElement,
    },
    whileElementsMounted: autoUpdate,
  });

  const clearHoverTimer = () => {
    if (hoverTimer.current !== undefined) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = undefined;
    }
  };

  useEffect(() => clearHoverTimer, []);

  const hideOverlay = () => {
    clearHoverTimer();
    setRefElement(null);
    setId(null);
    overlayContent.current = null;
    setIsShown(false);
  };

  const showOverlay = async (target: HTMLElement, id: string | null) => {
    overlayContent.current = await getOverlayContent?.(id);
    setId(id);
    setRefElement(target);
    setIsShown(true);
  };

  const toggleOverlay = async (target: HTMLElement, id: string | null) => {
    if (isShown) {
      hideOverlay();
    } else {
      await showOverlay(target, id);
    }
  };

  const getReferenceId = (target: HTMLElement) => {
    if (!target.classList.contains(baseClassName)) {
      return undefined;
    }

    return target.className.split(' ').find((className) => {
      const referenceId = className.slice(idClassPrefix.length);
      return className.startsWith(idClassPrefix) && referenceId !== '';
    })?.slice(idClassPrefix.length);
  };

  const handleClick = async (ev: MouseEvent<HTMLDivElement>) => {
    if (getOverlayContent === undefined) {
      setIsShown(false);
      return;
    }
    const target = ev.target as HTMLElement;
    const clickedId = getReferenceId(target);
    if (clickedId === undefined) {
      hideOverlay();
      return;
    }

    ev.preventDefault();
    if (clickedId === id) {
      await toggleOverlay(target, clickedId);
    } else {
      await showOverlay(target, clickedId);
    }
  };

  const handleMouseOver = (ev: MouseEvent<HTMLDivElement>) => {
    if (getOverlayContent === undefined) {
      return;
    }
    const target = ev.target as HTMLElement;
    const hoveredId = getReferenceId(target);
    if (hoveredId === undefined) {
      hideOverlay();
      return;
    }

    clearHoverTimer();
    hoverTimer.current = setTimeout( async () => {
      await showOverlay(target, hoveredId);
      hoverTimer.current = undefined;
    }, hoverDelay);
  };

  const handleMouseOut = (ev: MouseEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLElement;
    if (getReferenceId(target) !== undefined) {
      hideOverlay();
    }
  };

  if (!enabled) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div>
      <div onClick={trigger === 'click' ? handleClick : undefined}
           onMouseOver={trigger === 'hover' ? handleMouseOver : undefined}
           onMouseOut={trigger === 'hover' ? handleMouseOut : undefined} className={className} style={style}>
        {children}
      </div>
      {isShown && <div className="overlay-content"
                       onClick={() => hideOverlay()}
                       ref={node => setOverlayElement(node)}
                       style={{...floatingData.floatingStyles}}>
        {overlayContent.current}
      </div>}
    </div>
  );
}