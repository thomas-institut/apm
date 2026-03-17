import {Link, useParams} from "react-router";
import {useContext} from "react";
import {Breadcrumb, Spinner} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {ChunkInWorkInfo, EntityNameTuple} from "@/Api/ApmApiClient";
import {WorkData} from "@/Api/DataSchema/ApiWorks";
import WitnessTable from "@/ReactAPM/Pages/Chunk/WitnessTable";
import './chunk.css';
import {WitnessInfo} from "@/Api/DataSchema/WitnessInfo";
import WitnessCard from "@/ReactAPM/Pages/Chunk/WitnessCard";
import CollationTableInfoDivs from "@/ReactAPM/Pages/Chunk/CollationTableInfoDivs";
import {ChevronLeft, ChevronRight} from "react-bootstrap-icons";
import PageWithFixedHeaderContainer from "@/ReactAPM/PageWithFixedHeaderContainer";


interface GeneralData {
  docTypes: EntityNameTuple[];
  languages: EntityNameTuple[];
  workData: WorkData;
  chunksInWork: ChunkInWorkInfo[];
}

export default function Chunk() {

  let {workId, chunkId} = useParams();

  const context = useContext(AppContext);

  let chunkNumber = parseInt(chunkId ?? '');


  const getGeneralData = async (): Promise<GeneralData | null> => {
    if (workId === undefined) {
      return null;
    }
    const docTypes = await context.apiClient.getAvailableDocumentTypes();
    const languages = await context.apiClient.getAvailableLanguages();
    const workData = await context.apiClient.getWorkData(workId);
    const chunksInWork = await context.apiClient.getChunksInWorkInfo(workId);


    return {
      docTypes: docTypes, languages: languages, workData: workData, chunksInWork: chunksInWork
    };
  };

  const getWitnessesForChunk = async () => {
    if (workId === undefined || chunkId === undefined) {
      return [];
    }
    return context.apiClient.getWitnessesForChunk(workId, chunkNumber);
  };

  const workDataQuery = useQuery({queryKey: ['workData', workId], queryFn: getGeneralData});
  const witnessesQuery = useQuery({queryKey: ['witnesses', workId, chunkId], queryFn: getWitnessesForChunk});

  if (workId === undefined || chunkId === undefined) {
    return <NormalPageContainer>Error: Cannot find work or chunk</NormalPageContainer>;
  }

  function witnessInfoText(data: WitnessInfo[], languages: EntityNameTuple[]) {

    const numValidWitnesses = data.filter(w => w.isValid).length;

    const byLanguageCount = languages.map(l => {
      const count = data.filter(w => w.language === l[0]).length;
      return {language: l[1], count: count};
    });

    const labels: string[] = [];
    labels.push(`${data.length} total`);
    if (numValidWitnesses === data.length) {
      labels.push('all valid');
    } else {
      labels.push(`${numValidWitnesses} valid`);
    }
    byLanguageCount.forEach(l => {
      if (l.count > 0) labels.push(`${l.count} ${l.language}`);
    });

    return labels.join(', ');

  }


  if (workDataQuery.status === 'pending') {
    return <NormalPageContainer>Loading...</NormalPageContainer>;
  }

  if (workDataQuery.status === 'error') {
    return <NormalPageContainer>Error: {workDataQuery.error.message}</NormalPageContainer>;
  }

  document.title = `Chunk ${workId}-${chunkId}`;

  const generalData = workDataQuery.data;


  if (generalData === null) {
    return <NormalPageContainer>Error: No Work data</NormalPageContainer>;
  }


  const getPreviousChunkNumber = () => {
    const index = generalData.chunksInWork.findIndex(w => w.chunkNumber === chunkNumber);
    if (index === 0) {
      return null;
    }
    return generalData.chunksInWork[index - 1].chunkNumber;
  };


  const getNextChunkNumber = () => {
    const index = generalData.chunksInWork.findIndex(w => w.chunkNumber === chunkNumber);
    if (index === generalData.chunksInWork.length - 1) {
      return null;
    }
    return generalData.chunksInWork[index + 1].chunkNumber;
  };

  const previousChunkNumber = getPreviousChunkNumber();
  const nextChunkNumber = getNextChunkNumber();

  const header = <>
    <Breadcrumb>
      <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.works()}}>Works</Breadcrumb.Item>
      <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.work(workId)}}>{workId}</Breadcrumb.Item>
      <Breadcrumb.Item active>Chunk {chunkNumber}</Breadcrumb.Item>
    </Breadcrumb>
    <div style={{display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '2em', marginBottom: '1em'}}>
      <div className={'chunk-nav-arrow'}>
        {previousChunkNumber === null && <ChevronLeft/>}
        {previousChunkNumber !== null && <Link to={RouteUrls.chunk(workId, previousChunkNumber)}><ChevronLeft/></Link>}
      </div>
      <h1>
        <EntityLink id={generalData.workData.authorId}/>, <em>{generalData.workData.title}</em>,
        chunk {chunkId}
      </h1>
      <div className={'chunk-nav-arrow'}>
        {nextChunkNumber === null && <ChevronRight/>}
        {nextChunkNumber !== null && <Link to={RouteUrls.chunk(workId, nextChunkNumber)}><ChevronRight/></Link>}
      </div>
    </div>
  </>;

  if (witnessesQuery.status === 'error') {
    return <PageWithFixedHeaderContainer header={header}>
      <div>Error: {witnessesQuery.error.message}</div>
    </PageWithFixedHeaderContainer>;
  }

  if (witnessesQuery.status === 'pending') {
    return <PageWithFixedHeaderContainer header={header}>
      <div>
        <div><b>Chunk Id</b>: {workId}-{chunkId}</div>
      </div>
      <div>Loading witness data...<Spinner animation="border" size="sm"/></div>
    </PageWithFixedHeaderContainer>;
  }


  return (<PageWithFixedHeaderContainer header={header}>
      <div>
        <div><b>Chunk Id</b>: {workId}-{chunkId}</div>
        <div><b>Witnesses</b>: {witnessInfoText(witnessesQuery.data, generalData.languages)}</div>
      </div>

      <WitnessTable witnessInfoData={witnessesQuery.data} languages={generalData.languages}
                    docTypes={generalData.docTypes}/>

      <CollationTableInfoDivs workId={workId} chunkNumber={parseInt(chunkId)}/>

      <div className={'chunkPageSection'}>
        <h2>Automatic Collation Tables</h2>
        <div><em>... automatic collation tables will be here...</em></div>
      </div>
      <div className={'chunkPageSection'}>
        {witnessesQuery.data.map((w) => <WitnessCard key={w.systemId} witnessInfo={w}/>)}
      </div>
    </PageWithFixedHeaderContainer>);
}
