import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {useContext, useEffect} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import './works.css';
import Collapsible from "@/ReactAPM/Components/Collapsible";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import PersonLink from "@/ReactAPM/Components/PersonLink";
import {WorkId} from "@/toolbox/WorkId";
import {useDataStore} from "@/ReactAPM/Stores/DataStore";
import {varsAreEqual} from "@/toolbox/ObjectUtil";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";

export interface WorksByAuthorData {
  authorId: number;
  authorName: string;
  authorSortName: string;
  works: WorkData[];
}

interface WorkData {
  workId: string;
  entityId: number;
  title: string;
  chunks: ChunkData[];
}

interface ChunkData {
  chunkNumber: number;
  hasTranscription: boolean;
  hasCollation: boolean;
  hasEdition: boolean;
}

export default function Works() {

  document.title = 'Works';
  const appContext = useContext(AppContext);
  const data = useDataStore((state) => state.worksByAuthorData);
  const setData = useDataStore((state) => state.setWorksByAuthorData);
  const urlGen = new ApmUrlGenerator(appContext.baseUrl);

  const getWorksData = async () => {

    const workSortingFn = (a: WorkData, b: WorkData) => {
      return WorkId.compare(a.workId, b.workId);
    }

    const serverData = await appContext.apiClient.getAllWorksData();
    const worksFromServer = Object.values(serverData);

    const authors: number[] = [];

    worksFromServer.forEach((work) => {
      if (authors.indexOf(work.authorId) === -1) {
        authors.push(work.authorId);
      }
    });

    const data: WorksByAuthorData[] = [];
    for (const authorId of authors) {
      const personData = await appContext.apiClient.getPersonEssentialData(authorId);
      const authorData: WorksByAuthorData = {
        authorId: authorId,
        authorName: personData.name,
        authorSortName: personData.sortName,
        works: worksFromServer.filter(w => w.authorId === authorId).map((w): WorkData => {
          return {
            entityId: w.entityId, title: w.title, workId: w.workId, chunks: w.chunks.map((chunk): ChunkData => {
              return {
                chunkNumber: chunk.n, hasCollation: chunk.ct, hasEdition: chunk.ed, hasTranscription: chunk.tx
              };
            })
          };
        }).sort(workSortingFn),
      };
      data.push(authorData);
    }
    console.log(data);
    return data.sort((a, b) => a.authorSortName.localeCompare(b.authorSortName));
  };

  const queryResult = useQuery<WorksByAuthorData[]>({
    queryKey: ['works'], queryFn: () => getWorksData(),
  });

  useEffect( () => {
    if (queryResult.status === 'success') {

      if (varsAreEqual(data, queryResult.data)) {
        return;
      }
      console.log('Data changed, updating store');
      setData(queryResult.data);
    }
  }, [queryResult.status]);

  const getContentFromData = (data: WorksByAuthorData[]) => {

    return (<div>
      {data.map((authorData) => {
        return (<div key={authorData.authorId} className="worksByAuthorContainer">
          <h1><PersonLink personId={authorData.authorId} name={authorData.authorName}/></h1>
          <div className="worksByAuthorDiv">
            {authorData.works.map((workData) => {
              return (<Collapsible key={workData.workId}
                                   className="workCollapsible"
                                   header={<EntityLink id={workData.entityId} type='work' name={`${workData.workId}: ${workData.title}`}/>} startOpen={false}>
                  <div className="worksChunksDiv">
                    {workData.chunks.map((chunkData) => {
                      return (<div className="chunkDiv" key={chunkData.chunkNumber}><a href={urlGen.siteChunkPage(workData.workId, chunkData.chunkNumber)}>{chunkData.chunkNumber}</a></div>);
                    })}
                  </div>
                </Collapsible>);
            })}
          </div>
        </div>);
      })}
    </div>);
  };

  let content = null;
  let queryStatusDiv = (<div></div>);
  if (data.length > 0) {
    content = getContentFromData(data);
  }

  switch (queryResult.status) {
    case 'pending':
      queryStatusDiv = <div className="appearAfterOneSecond text-secondary">Checking for updated data...</div>;
      break;

    case 'error':
      if (data.length === 0) {
        content = <div className="text-danger">Error: {queryResult.error.message}</div>;
      } else {
        queryStatusDiv = <div className="text-danger">Error checking data, shown data may be out of date</div>;
      }
      break;
  }

  return (<NormalPageContainer>
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div style={{flexGrow: 0}} key="header">
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <h1>Works</h1>
          {queryStatusDiv}
        </div>
        <div className="note">These are the works that have transcription, collation table or edition data in the system.
          Other works can be found by visiting the author's page.
        </div>
      </div>
      <div style={{flexGrow: 1, overflow: 'auto', marginBottom: '1em'}}>
        {content}
      </div>

    </div>



  </NormalPageContainer>);
}

