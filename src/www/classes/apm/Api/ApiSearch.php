<?php
namespace APM\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

require '/home/lukas/apm/vendor/autoload.php';

class ApiSearch extends ApiController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function search(Request $request, Response $response): Response
    {
        // Arrays
        $books = [];
        $authors = [];
        $docIDs = [];
        $results = [];

        // Get user input and current time
        $keyword = $_POST['searchText'];
        $now = TimeString::now();

        // Setup OpenSearch php client
        $client = (new \OpenSearch\ClientBuilder())
            ->setHosts(['https://localhost:9200'])
            ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Set the name of the index
        $indexName = 'philosophers';

        // Query the index
        $query = $client->search([
            'index' => $indexName,
            'body' => [
                'query' => [
                    'multi_match' => [
                        'query' => $keyword,
                        'fields' => ['author', 'book']
                    ]
                ]
            ]
        ]);

        $numMatches = $query['hits']['total']['value'];

        // Collect all matches and enumerate them in a string
        if ($numMatches != 0) {
            for ($i = 0; $i <= $numMatches - 1; $i++) {
                $docIDs[$i] = $query['hits']['hits'][$i]['_id'];
                $authors[$i] = $query['hits']['hits'][$i]['_source']['author'];
                $books[$i] = $query['hits']['hits'][$i]['_source']['book'];
                $results[$i] = [$authors[$i], $books[$i], $docIDs[$i]];
            }
        }


        return $this->responseWithJson($response, ['searchString' => $keyword,  'results' => $results, 'serverTime' => $now]);
    }
}

