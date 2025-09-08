import {Container} from "react-bootstrap";
import {ReactNode} from "react";


interface NormalPageProps {
  contentClassName?: string;
  children: ReactNode;
}

export default function NormalPageContainer(props: NormalPageProps) {
  return (
      <Container style={{flexGrow: 1, overflowX: "auto", overflowY: "auto"}} className={props.contentClassName ?? ''}>
        {props.children}
      </Container>
  );
}