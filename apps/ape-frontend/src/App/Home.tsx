import {useContext} from "react";
import {ApeContext} from "@/App/App";
import {useQuery} from "@tanstack/react-query";
import {Link} from "react-router";
import PageLayout from "@/ui/ApeUx/PageLayout";
import {PublicationListing} from "@shared/ts";


export function Home() {

  const context = useContext(ApeContext);
  const apiClient = context.apiClient;
  const appShortName = context.appConfig?.shortName ?? 'APE';

  document.title = `${appShortName}: Home`;

  const publicationListingsQuery = useQuery({
    queryKey: ['publicationListings'],
    queryFn: async () => {
      const response = await apiClient?.getPublicationListings();
      if (!response || response.result === 'Error') {
        throw new Error(response?.message || 'Failed to fetch publications');
      }
      return response.data;
    },
    enabled: !!apiClient,
  });

  const PubSection = (title: string, publications: PublicationListing[]) => {
    if (publications.length === 0) {
      return null;
    }
    return (
      <div className={'pub-section'}>
        <h2>{title}</h2>
        <ul>
          {publications.map((publication) => (
            <li key={publication.id}><Link to={`/publication/${publication.id}`} className="pub-title-link">{publication.title}</Link></li>
          ))}
        </ul>
      </div>
    )
  }

  let actualContent = null;

  if (publicationListingsQuery.isLoading) {
    actualContent = <div>Loading publications...</div>;
  } else {
    if (publicationListingsQuery.isError) {
      actualContent = <div>Error: {publicationListingsQuery.error.message}</div>;
    } else {
      const publications = publicationListingsQuery.data || [];

      if( publications.length === 0 ) {
        return "No publications found"
      }

      const transcriptions = publications
        .filter((publication) => publication.type ==='transcription')
        .sort((a, b) => a.title.localeCompare(b.title));

      const editions = publications
        .filter((publication) => publication.type ==='edition')
        .sort((a, b) => a.title.localeCompare(b.title));

      const texts = publications
        .filter((publication) => publication.type ==='text')
        .sort((a, b) => a.title.localeCompare(b.title));

      actualContent = (
        <>
          {PubSection("Editions", editions)}
          {PubSection("Transcriptions", transcriptions)}
          {PubSection("Texts", texts)}
        </>
      );
    }
  }


  return (<PageLayout>
      <h1>Welcome</h1>
      <p>These are the digital publications from the <a href={"https://averroes.uni-koeln.de"}>Averroes Project</a></p>
      {actualContent}
    </PageLayout>
  );
}
