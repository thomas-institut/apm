import {useParams} from "react-router";
import {JSX, useContext, useState} from "react";
import {ApeContext} from "@/App/App";
import {useQuery} from "@tanstack/react-query";
import {docTypeName, getTranscribedPages, TextPublicationData, TranscriptionData} from "@/Api/Schema/ApiPublication";
import {TranscriptionViewer} from "@/ui/TranscriptionViewer/TranscriptionViewer";
import PageLayout, {TopBarCenter, TopBarRight} from "@/ui/ApeUx/PageLayout";
import {nameFromCode} from "@/Lang/Lang";
import {Clock, InfoLg} from "react-bootstrap-icons";
import {IconToggle} from "@/ui/ApeUx/Widgets/IconToggle";

export function PublicationPage() {
  const {id} = useParams<{ id: string }>();
  const context = useContext(ApeContext);
  const apiClient = context.apiClient;

  const [ showAllPages, setShowAllPages] = useState(false);

  const publicationId = id ? parseInt(id) : undefined;

  const publicationQuery = useQuery({
    queryKey: ['publication', publicationId],
    queryFn: async () => {
      if (publicationId === undefined) return null;
      const response = await apiClient?.getPublicationData(publicationId);
      if (!response || response.result === 'Error') {
        throw new Error(response?.message || 'Failed to fetch publication');
      }
      return response.data;
    },
    enabled: !!apiClient && publicationId !== undefined,
  });

  const infoLayout = (content: JSX.Element) => (
    <PageLayout>
      {content}
    </PageLayout>
  );

  if (publicationQuery.isLoading) {
    return infoLayout(<div>Loading publication...</div>);
  }

  if (publicationQuery.isError) {
    return infoLayout(<div>Error: {publicationQuery.error.message}</div>);
  }

  let publication = publicationQuery.data;

  if (!publication) {
    return <div>Publication not found</div>;
  }

  const transcriptionData = publication as TranscriptionData;
  const textPublicationData = publication as TextPublicationData;

  const appShortName = context.appConfig?.shortName ?? 'APE';

  document.title = `${appShortName}: ${publication.title}`;

  const getDocInfo = (transcriptionData: TranscriptionData) => {
    const numPages = transcriptionData.pages.length;
    const transcribed = getTranscribedPages(transcriptionData).length;
    return `${numPages} pages, ${transcribed} transcribed`;
  };



  return (
    <PageLayout>
      <TopBarCenter>
        <h1>{publication.title}</h1>
        {publication.type === 'transcription' &&
          <div>{nameFromCode(transcriptionData.languageCode)} {docTypeName(transcriptionData.docType)} </div>}
        {publication.type === 'transcription' && <div>{getDocInfo(transcriptionData)}</div>}
        <div style={{color: 'gray'}}>
          <InfoLg title={'Id:' + publication.id}/> <Clock title={'Version:' + publication.versionTimeString}/>
        </div>
      </TopBarCenter>
      <TopBarRight>
        { publication.type === 'transcription' && <div>All pages: <IconToggle on={showAllPages} onToggleChange={(state) => setShowAllPages(state)}/></div>}
      </TopBarRight>
      {publication.type === 'text' && <div>{textPublicationData.text}</div>}
      {publication.type === 'transcription' &&
        <TranscriptionViewer viewerType={'singlePageText'} showAllPages={showAllPages} data={transcriptionData}/>}
    </PageLayout>
  );
}

