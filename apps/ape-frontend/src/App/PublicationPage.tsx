import {useParams, Link} from "react-router";
import {useContext} from "react";
import {ApeContext} from "@/App/App";
import {useQuery} from "@tanstack/react-query";
import {Breadcrumb, ListGroup} from "react-bootstrap";

export function PublicationPage() {
  const {id} = useParams<{id: string}>();
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

  const publication = publicationQuery.data;

  if (!publication) {
    return <div>Publication not found</div>;
  }

  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: "/"}}>Home</Breadcrumb.Item>
        <Breadcrumb.Item active>{publication.title}</Breadcrumb.Item>
      </Breadcrumb>
      <h3>Publication Details</h3>
      <ListGroup>
        {Object.entries(publication).map(([key, value]) => (
          <ListGroup.Item key={key}>
            <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  );
}
