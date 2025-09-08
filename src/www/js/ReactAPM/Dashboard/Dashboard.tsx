import NormalPageContainer from "@/ReactAPM/NormalPageContainer";


import "./dashboard.css";
import MceListForUser from "@/ReactAPM/Dashboard/MceListForUser";
import {useContext, useRef} from "react";
import {AppContext} from "@/ReactAPM/App";
import CtListForUser from "@/ReactAPM/Dashboard/CtListForUser";
import {ListGroup} from "react-bootstrap";

export default function Dashboard() {
  document.title = "Dashboard";

  const appContext = useContext(AppContext);

  const fakeTranscriptions = [];
  for (let i = 0; i < 50; i++) {
    fakeTranscriptions.push(<li key={i}>Transcription {i}</li>);
  }

  const mceRef = useRef(null);
  const txRef = useRef(null);
  const edRef = useRef(null);
  const ctRef = useRef(null);
  const contentRef = useRef(null);

  const bringRefIntoView = (ref: any, parent: any) => {
    console.log(`Bringing ref into view, parent: scrollTop ${parent.current.scrollTop}, offset ${parent.current.offsetTop}, ref: offsetTop ${ref.current.offsetTop}`);
    parent.current.scrollTop = (ref.current.offsetTop - parent.current.offsetTop);
  };

  return (<NormalPageContainer contentClassName="dashboard">

    <div className="dashboard-anchors">
      <ListGroup variant="flush">
        <ListGroup.Item style={{cursor: "pointer"}} onClick={() => bringRefIntoView(mceRef, contentRef)}>MultiChunkEditions</ListGroup.Item>
        <ListGroup.Item style={{cursor: "pointer"}} onClick={() => bringRefIntoView(edRef, contentRef)}>Editions</ListGroup.Item>
        <ListGroup.Item style={{cursor: "pointer"}} onClick={() => bringRefIntoView(ctRef, contentRef)}>Collation Tables</ListGroup.Item>
        <ListGroup.Item style={{cursor: "pointer"}} onClick={() => bringRefIntoView(txRef, contentRef)}>Transcriptions</ListGroup.Item>
      </ListGroup>
    </div>

    <div className="dashboard-contents" ref={contentRef}>
      <h1 className="first" ref={mceRef}>MultiChunkEditions</h1>
      <MceListForUser userId={appContext.userId}/>
      <CtListForUser userId={appContext.userId} edRef={edRef} ctRef={ctRef}/>
      <h1 ref={txRef}>Transcriptions</h1>
      <ul>
        {fakeTranscriptions}
      </ul>
    </div>
  </NormalPageContainer>);
}