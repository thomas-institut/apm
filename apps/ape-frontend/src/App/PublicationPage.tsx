import {Link, useParams} from "react-router";
import {useContext} from "react";
import {ApeContext} from "@/App/App";
import {useQuery} from "@tanstack/react-query";
import {Breadcrumb} from "react-bootstrap";
import {TextPublicationData, TranscriptionData} from "@/Api/Schema/ApiPublication";
import {TranscriptionViewer} from "@/ui/TranscriptionViewer/TranscriptionViewer";
import PageLayout from "@/ui/ApeUx/PageLayout";

export function PublicationPage() {
  const {id} = useParams<{ id: string }>();
  const context = useContext(ApeContext);
  const apiClient = context.apiClient;

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

  if (publicationQuery.isLoading) {
    return <div>Loading publication...</div>;
  }

  if (publicationQuery.isError) {
    return <div>Error: {publicationQuery.error.message}</div>;
  }

  let publication = publicationQuery.data;

  if (!publication) {
    return <div>Publication not found</div>;
  }

  const transcriptionData  = publication as TranscriptionData;
  const textPublicationData = publication as TextPublicationData;


  return (
    <PageLayout topBarCenterItems={<h1>{publication.title}</h1>}>
      <p>{publication.description}</p>
      <p>Type: {publication.type}</p>
      <p>Version: {publication.versionTimeString}</p>
      { publication.type === 'transcription' && <p>Language: {transcriptionData.languageCode}</p>}
      { publication.type === 'text' && <div>{textPublicationData.text}</div> }
      { publication.type === 'transcription' && <TranscriptionViewer viewerType={'singlePageText'} data={transcriptionData} />}
    </PageLayout>
  );
}
