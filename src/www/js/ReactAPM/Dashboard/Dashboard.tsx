import NormalPageContainer from "@/ReactAPM/NormalPageContainer";


import "./dashboard.css";
import MceListForUser from "@/ReactAPM/Dashboard/MceListForUser";
import {RefObject, useContext, useRef} from "react";
import {AppContext} from "@/ReactAPM/App";
import CtListForUser from "@/ReactAPM/Dashboard/CtListForUser";
import AnchorList from "@/ReactAPM/Components/AnchorList";



export default function Dashboard() {
  document.title = "Dashboard";

  const appContext = useContext(AppContext);

  const fakeTranscriptions = [];
  for (let i = 0; i < 50; i++) {
    fakeTranscriptions.push(<p key={i}>Transcription {i}</p>);
  }

  const mceRef: RefObject<HTMLDivElement|null> = useRef(null);
  const txRef: RefObject<HTMLDivElement|null> = useRef(null);
  const edRef: RefObject<HTMLDivElement|null> = useRef(null);
  const ctRef: RefObject<HTMLDivElement|null> = useRef(null);
  const contentRef: RefObject<HTMLDivElement|null> = useRef(null);
  const anchorRefs = [mceRef, edRef, ctRef, txRef];
  const anchorTitles = ["Editions","Chunk Editions", "Collation Tables", "Transcriptions"];
  return (
    <>
      <NormalPageContainer contentClassName="dashboard">

        <AnchorList contentRef={contentRef} anchorsRefs={anchorRefs} anchorTitles={anchorTitles} className="dashboard-anchors"/>

        <div className="dashboard-contents" ref={contentRef}>
          <h1 className="first" ref={mceRef}>Editions</h1>
          <MceListForUser userId={appContext.userId} itemClassName={"dashboard-list-item"}/>
          <CtListForUser userId={appContext.userId} edRef={edRef} ctRef={ctRef} itemClassName={"dashboard-list-item"}/>
          <h1 ref={txRef}>Transcriptions</h1>
          <ul>
            {fakeTranscriptions}
          </ul>
        </div>
      </NormalPageContainer>
    </>
    );
}