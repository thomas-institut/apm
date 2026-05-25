import {useContext} from "react";
import {ApeContext} from "@/App/App";
import {useQuery} from "@tanstack/react-query";
import {Card, Col, Row} from "react-bootstrap";
import {Link} from "react-router";


export function Home() {

  const context = useContext(ApeContext);
  const apiClient = context.apiClient;

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

  if (publicationListingsQuery.isLoading) {
    return <div>Loading publications...</div>;
  }

  if (publicationListingsQuery.isError) {
    return <div>Error: {publicationListingsQuery.error.message}</div>;
  }

  const publications = publicationListingsQuery.data || [];


  return (<div className={'home'}>
      <h1>{context.appConfig?.name}</h1>
      <p>These are the digital publications from the <a href={"https://averroes.uni-koeln.de"}>Averroes Project</a></p>
      <Row xs={1} md={2} lg={3} className="g-4">
        {publications.map((publication) => (
          <Col key={publication.id}>
            <Card className="h-100">
              <Card.Body>
                <Card.Title>{publication.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  {publication.type} (ID: {publication.id})
                </Card.Subtitle>
                <Card.Text>
                  {publication.description}
                </Card.Text>
                <Link to={`/publication/${publication.id}`} className="btn btn-sm btn-secondary">
                  View Publication
                </Link>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>


  );
}
