import {ReactNode} from "react";
import {Spinner} from "react-bootstrap";

interface ComponentWithPendingProps {
  pending: boolean;
  pendingTitle?: string;
  children: ReactNode;
}


export default function ComponentWithPending(props: ComponentWithPendingProps){

  if (props.pending) {
    return <Spinner animation={'border'} size={'sm'}
             title={props.pendingTitle ?? ''}/>;
  }
  return props.children;
}