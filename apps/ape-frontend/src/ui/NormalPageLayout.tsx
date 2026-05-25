import {Container} from "react-bootstrap";
import {ReactNode} from "react";
import {NormalPageTopBar} from "@/ui/NormalPageTopBar";


interface NormalPageProps {
  contentClassName?: string;
  children: ReactNode;
}

export default function NormalPageLayout(props: NormalPageProps) {

  return (
    <Container>
      <NormalPageTopBar/>
      <div className={props.contentClassName ?? ''}>
        {props.children}
      </div>
    </Container>
  );
}
