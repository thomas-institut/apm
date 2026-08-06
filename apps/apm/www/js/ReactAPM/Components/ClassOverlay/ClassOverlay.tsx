import React, {MouseEvent, ReactNode, useState} from "react";
import {flip, useFloating, autoUpdate, offset, shift} from "@floating-ui/react";


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
  getOverlayContent?: (id: string | null) => ReactNode;
}


export default function ClassOverlay({
                                       children,
                                       getOverlayContent,
                                       baseClassName = 'overlay',
                                       placement = 'bottom',
                                       idClassPrefix,
                                       overlayOffset = 5
                                     }: ClassOverlayProps) {

  if (idClassPrefix === undefined) {
    idClassPrefix = baseClassName + '-';
  }
  const [refElement, setRefElement] = React.useState<HTMLElement | null>(null);
  const [overlayElement, setOverlayElement] = React.useState<HTMLElement | null>(null);
  const [isShown, setIsShown] = useState(false);
  const [id, setId] = useState<string | null>('default');

  const floatingData = useFloating({
    placement: placement,
    middleware: [offset(overlayOffset), flip(), shift()],
    elements: {
      reference: refElement,
      floating: overlayElement,
    },
    whileElementsMounted: autoUpdate,
  });

  const hideOverlay = () => {
    setRefElement(null);
    setIsShown(false);
  };

  const showOverlay = (target: HTMLElement) => {
    setRefElement(target);
    setIsShown(true);
  };

  const toggleOverlay = (target: HTMLElement) => {
    setIsShown(s => !s);
    if (isShown) {
      hideOverlay();
    } else {
      showOverlay(target);
    }
  };

  const handleClick = (ev: MouseEvent<HTMLDivElement>) => {
    if (getOverlayContent === undefined) {
      setIsShown(false);
      return;
    }
    const target = ev.target as HTMLElement;
    if (target.classList.contains(baseClassName)) {
      target.className.split(' ').forEach((className) => {
        if (className.startsWith(idClassPrefix)) {
          const clickedId = className.slice(idClassPrefix.length);
          if (clickedId === '') {
            return;
          }
          ev.preventDefault();
          setId(clickedId);
          if (clickedId === id) {
            toggleOverlay(target);
          } else {
            showOverlay(target);
          }
        }
      });
    } else {
      hideOverlay();
    }
  };

  return (
    <div>
      <div onClick={handleClick}>
        {children}
      </div>
      {isShown && <div className="overlay-content"
                       onClick={() => hideOverlay()}
                       ref={node => setOverlayElement(node)}
                       style={{...floatingData.floatingStyles}}>
        {getOverlayContent ? getOverlayContent(id) : null}
      </div>}
    </div>
  );

}