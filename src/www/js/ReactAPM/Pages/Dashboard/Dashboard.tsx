import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import "./dashboard.css";
import MceListForUser from "@/ReactAPM/Components/MceListForUser";
import {RefObject, useContext, useEffect, useRef} from "react";
import {AppContext} from "@/ReactAPM/App";
import CtListForUser from "@/ReactAPM/Components/CtListForUser";
import AnchorList from "@/ReactAPM/Components/AnchorList";
import TranscriptionsForUser from "@/ReactAPM/Components/TranscriptionsForUser";
import {useQuery} from "@tanstack/react-query";
import {ApiUserMultiChunkEdition} from "@/Api/DataSchema/ApiUserMultiChunkEdition";
import {varsAreEqual} from "@/toolbox/ObjectUtil";
import {useDataStore} from "@/ReactAPM/Stores/DataStore";


export default function Dashboard() {
  document.title = "Dashboard";

  const appContext = useContext(AppContext);
  const userId = appContext.userId;
  const mceData = useDataStore((state) => state.multiChunkEditionsForLoggedUser);
  const setMceData = useDataStore((state) => state.setMultiChunkEditionsForLoggedUser);

  const ctData = useDataStore((state) => state.collationTablesForLoggedUser);
  const setCtData = useDataStore((state) => state.setCollationTablesForLoggedUser);

  const txData = useDataStore((state) => state.transcriptionsForLoggedUser);
  const setTxData = useDataStore((state) => state.setTranscriptionsForLoggedUser);

  // MCE Data
  const getMceListForUser = (userId: number) => {
    return appContext.apiClient.userMultiChunkEditions(userId);
  };

  const apiUserMceResult = useQuery<ApiUserMultiChunkEdition[]>({
    queryKey: ['mceList', userId], queryFn: () => getMceListForUser(userId),
  });

  useEffect(() => {
    if (apiUserMceResult.status === 'success') {

      if (varsAreEqual(mceData, apiUserMceResult.data)) {
        return;
      }
      console.log('Data changed, updating store');
      setMceData(apiUserMceResult.data);
    }
  }, [apiUserMceResult.status]);

  // CT data
  const getCtListForUser = (userId: number) => {
    return appContext.apiClient.userCollationTables(userId);
  };

  const apiCtUserResult = useQuery({
    queryKey: ['ctList', userId], queryFn: () => getCtListForUser(userId),
  });

  useEffect(() => {
    if (apiCtUserResult.status === 'success') {

      if (varsAreEqual(ctData, apiCtUserResult.data)) {
        return;
      }
      console.log('Data changed, updating store');
      setCtData(apiCtUserResult.data);
    }
  }, [apiCtUserResult.status]);


  // TX data

  const getTranscriptionsForUser = (userId: number) => {
    return appContext.apiClient.userTranscriptions(userId);
  };

  const apiTxForUserResult = useQuery({
    queryKey: ['transcriptions', userId], queryFn: () => getTranscriptionsForUser(userId),
  });

  useEffect(() => {
    if (apiTxForUserResult.status === 'success') {

      if (varsAreEqual(txData, apiTxForUserResult.data)) {
        return;
      }
      console.log('Data changed, updating store');
      setTxData(apiTxForUserResult.data);
    }
  }, [apiTxForUserResult.status]);

  let queryStatusDiv = (<div></div>);

  if (apiUserMceResult.status === 'pending' || apiCtUserResult.status === 'pending' || apiTxForUserResult.status === 'pending') {
    queryStatusDiv = <div className="appearAfterOneSecond text-secondary">Checking for updated data...</div>;
  }

  if (apiUserMceResult.status === 'error' || apiCtUserResult.status === 'error' || apiTxForUserResult.status === 'error') {
    queryStatusDiv = <div className="text-danger">Error checking data, shown data may be out of date</div>;
  }


  const mceRef: RefObject<HTMLDivElement | null> = useRef(null);
  const txRef: RefObject<HTMLDivElement | null> = useRef(null);
  const edRef: RefObject<HTMLDivElement | null> = useRef(null);
  const ctRef: RefObject<HTMLDivElement | null> = useRef(null);
  const contentRef: RefObject<HTMLDivElement | null> = useRef(null);
  const anchorRefs = [mceRef, edRef, ctRef, txRef];
  const anchorTitles = ["Editions", "Chunk Editions", "Collation Tables", "Transcriptions"];
  return (<>
      <NormalPageContainer>
        <div style={{display: 'flex', flexDirection: 'column', height: '100%', width: '100%'}}>
          <div style={{flexGrow: 0}} key="header">
            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
              <h1>Dashboard</h1>
              {queryStatusDiv}
            </div>
          </div>
          <div style={{flexGrow: 1, overflow: 'auto', marginBottom: '1em'}} className="dashboard">
            <AnchorList contentRef={contentRef} anchorsRefs={anchorRefs} anchorTitles={anchorTitles}
                        className="dashboard-anchors"/>
            <div className="dashboard-contents" ref={contentRef}>
              <h1 className="first" ref={mceRef}>Editions</h1>
              <MceListForUser itemClassName={"dashboard-list-item"} data={mceData}/>
              <h1 ref={edRef}>Chunk Editions</h1>
              <CtListForUser itemClassName={"dashboard-list-item"} type="edition" data={ctData}/>
              <h1 ref={ctRef}>Collation Tables</h1>
              <CtListForUser itemClassName={"dashboard-list-item"} type="ctable" data={ctData}/>
              <h1 ref={txRef}>Transcriptions</h1>
              <TranscriptionsForUser data={txData}/>
            </div>
          </div>
        </div>

      </NormalPageContainer>
    </>);
}