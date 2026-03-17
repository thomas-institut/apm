import {Container} from "react-bootstrap";
import {JSX, ReactNode} from "react";


interface NormalPageProps {
  contentClassName?: string;
  headerClassName?: string;
  header: JSX.Element;
  children: ReactNode;
}

export default function PageWithFixedHeaderContainer(props: NormalPageProps) {
  return (<>
      <Container style={{flexGrow: 0}} className={props.headerClassName ?? ''}>{props.header}</Container>
      <Container style={{flexGrow: 1, overflowX: "auto", overflowY: "auto"}} className={props.contentClassName ?? ''}>
        {props.children}
      </Container>
  </>
  );
}