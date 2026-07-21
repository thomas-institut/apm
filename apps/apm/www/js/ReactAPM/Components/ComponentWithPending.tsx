import {CSSProperties, JSX, ReactNode, useLayoutEffect, useRef, useState} from "react";
import {Spinner} from "react-bootstrap";

interface ComponentWithPendingProps {
  /**
   * if true, the pending component will be displayed instead of the children
   */
  pending: boolean;

  /**
   * Element to display when pending is true.
   *
   * If not given, a spinner will be displayed
   *
   */
  pendingElement?: JSX.Element;
  /**
   * The title to display on the spinner if no pendingElement is given
   */
  pendingTitle?: string;
  /**
   * If true, the pending component will be displayed in a smart container that will resize to fit the pending component.
   */
  smartContainer?: boolean;
  children: ReactNode;
}


export default function ComponentWithPending(props: ComponentWithPendingProps){

  const ref = useRef<HTMLSpanElement>(null);
  const [ dimensions, setDimensions] = useState<{width:number, height:number}>({width: -1, height: -1});

  const smartContainer = props.smartContainer ?? false;



  useLayoutEffect(() => {
    if (ref.current === null) {
      return;
    }
    if (dimensions.width === -1) {
      setDimensions({width: ref.current.offsetWidth, height: ref.current.offsetHeight});
    }
  }, [ref]);

  const content = <>
    { props.pending && props.pendingElement && props.pendingElement}
    { props.pending && !props.pendingElement && <Spinner animation={'border'} size={'sm'}
                                                         title={props.pendingTitle ?? ''}/>}
    {!props.pending && props.children}
  </>

  if (!smartContainer) {
    return content;
  }

  const style: CSSProperties = props.pending  && dimensions.width !== -1 ? {
    width: dimensions.width,
    height: dimensions.height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } : {};


  return <span ref={ref} style={style}>
    {content}
  </span>;
}

