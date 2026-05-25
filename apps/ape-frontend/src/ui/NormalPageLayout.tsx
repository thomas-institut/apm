import {Container} from "react-bootstrap";
import {ReactNode} from "react";
import {NormalPageTopBar} from "@/ui/NormalPageTopBar";


interface NormalPageProps {
  contentClassName?: string;
  children: ReactNode;
}

export default function NormalPageLayout(props: NormalPageProps) {

  return (
    <Container style={{width: '100%', maxWidth: '100%'}}>
      <NormalPageTopBar/>
      <div className={props.contentClassName ?? ''}>
        {props.children}
      </div>
    </Container>
  );
}
