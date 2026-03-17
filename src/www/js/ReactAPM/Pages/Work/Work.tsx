import {Link, useParams} from "react-router";
import {Breadcrumb} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";

import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {Tid} from "@/Tid/Tid";
import NotFound from "@/ReactAPM/NotFound";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";


interface ChunkInfo {
  chunkNumber: number;
  hasCollationTables: boolean;
  hasEditions: boolean;
}

export default function Work() {

  const {workId} = useParams();
  const context = useContext(AppContext);
  const urlGen = new ApmUrlGenerator(context.baseUrl);

  if (workId === undefined) {
    return <NotFound/>;
  }
  let numericalWorkId = Tid.fromCanonicalString(workId);

  if (workId.length < 8) {
    // an APM id, e.g. 'AW47'
    numericalWorkId = -1;
  }

  async function getWorkData() {
    if (workId === undefined) {
      return null;
    }
    if (numericalWorkId < 0) {
      const data = await context.apiClient.getWorkDataOld(workId);
      numericalWorkId = data.id;
    }
    return context.apiClient.getWorkData(numericalWorkId);
  }

  const workDataQueryResult = useQuery({queryKey: ['workData', numericalWorkId], queryFn: getWorkData});

  async function getChunksData() {
    if (workDataQueryResult.status !== 'success' || workDataQueryResult.data === null) {
      return [];
    }
    return context.apiClient.getChunksInWorkInfo(workDataQueryResult.data.workId);
  }

  const chunksDataQueryResult = useQuery({
    queryKey: ['chunksData', numericalWorkId],
    queryFn: getChunksData,
    enabled: workDataQueryResult.status === 'success'
  });

  const provisionalBreadCrumb = <Breadcrumb>
    <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.works()}}>Works</Breadcrumb.Item>
    <Breadcrumb.Item active>{workId}</Breadcrumb.Item>
  </Breadcrumb>;

  if (workDataQueryResult.status === 'pending') {
    return <NormalPageContainer>{provisionalBreadCrumb}
      <div>Loading work data...</div>
    </NormalPageContainer>;
  }

  if (workDataQueryResult.status === 'error') {
    return <NormalPageContainer>{provisionalBreadCrumb}
      <div className="text-danger">Error: {workDataQueryResult.error.message}</div>
    </NormalPageContainer>;
  }

  const workData = workDataQueryResult.data;

  if (workData === null) {
    return <NormalPageContainer>{provisionalBreadCrumb}
      <div className="text-danger">Error: No Work data</div>
    </NormalPageContainer>;
  }

  let chunkTable = <div>Loading...</div>;


  if (chunksDataQueryResult.status === 'error') {
    chunkTable = <div>Error: {chunksDataQueryResult.error.message}</div>;
  }

  if (chunksDataQueryResult.status === 'success') {
    if (chunksDataQueryResult.data.length === 0) {
      chunkTable = <div><em>No chunks with transcription, collation tables or editions in the system</em></div>;
    } else {
      chunkTable = <>
        <h4>Chunks</h4>
        <div style={{display: 'grid', marginLeft: '2em', gridTemplateColumns: ' repeat(20, 3em)', gap: '0.5em'}}>
          {chunksDataQueryResult.data.map(d => <div key={d.chunkNumber}><a
            href={urlGen.siteChunkPage(workData.workId, d.chunkNumber)}>{d.chunkNumber}{d.hasCollationTables || d.hasEditions ? '*' : ''}</a>
          </div>)}
        </div>
      </>;
    }
  }

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.works()}}>Works</Breadcrumb.Item>
        <Breadcrumb.Item active>{workData.workId}</Breadcrumb.Item>
      </Breadcrumb>
      <div>
        <h2><EntityLink id={workData.authorId} type={'person'}/>, <em>{workData.title}</em></h2>
        <div>
          <div>Entity Id: {Tid.toCanonicalString(workData.entityId)}</div>
          <div>Work Id: {workData.workId}</div>
        </div>
        {context.userIsAdmin ?
          <div style={{marginTop: '1em'}}><a href={urlGen.siteAdminEntity(workData.entityId)}>[Entity Page]</a>
          </div> : null}
        <div style={{marginTop: '1em'}}>
          {chunkTable}
        </div>

      </div>
    </NormalPageContainer>);
}