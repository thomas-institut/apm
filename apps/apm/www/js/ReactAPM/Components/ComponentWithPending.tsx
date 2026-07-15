import {CSSProperties, ReactNode, useLayoutEffect, useRef, useState} from "react";
import {Spinner} from "react-bootstrap";

interface ComponentWithPendingProps {
  pending: boolean;
  pendingTitle?: string;
  smartContainer?: boolean
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

  if (!smartContainer) {
    return <>
      { props.pending && <Spinner animation={'border'} size={'sm'}
                                  title={props.pendingTitle ?? ''}/>}
      {!props.pending && props.children}
    </>;
  }

  const style: CSSProperties = props.pending  && dimensions.width !== -1 ? {
    width: dimensions.width,
    height: dimensions.height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } : {};


  return <span ref={ref} style={style}>
    { props.pending && <Spinner animation={'border'} size={'sm'}
             title={props.pendingTitle ?? ''}/>}
    {!props.pending && props.children}
  </span>;
}

