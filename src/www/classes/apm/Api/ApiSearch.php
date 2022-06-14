<?php
namespace APM\Api;

use PhpParser\Error;
use PHPUnit\Util\Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

require '/home/lukas/apm/vendor/autoload.php';

set_time_limit(5); // Script should not run longer than 5 seconds - does this work like this?

class ApiSearch extends ApiController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function search(Request $request, Response $response): Response
    {

        // Arrays for structuring queried data
        $authors = [];
        $titles = [];
        $docIDs = [];
        $results = [];

        // Variable for communicating errors
        $status = 'OK';

        // Get user input and current time
        $keyword = $_POST['searchText'];
        $now = TimeString::now();

        // Setup OpenSearch php client
        try {
            $client = (new \OpenSearch\ClientBuilder())
                ->setHosts(['https://localhost:9200'])
                ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
                ->setSSLVerification(false) // For testing only. Use certificate for validation
                ->build();
        } catch (Exception $e) { // This error handling has seemingly no effect right now - error message is currently generated in js
            $status = 'Connecting to OpenSearch server failed.';
            return $this->responseWithJson($response, ['searchString' => $keyword,  'results' => $results, 'serverTime' => $now, 'status' => $status]);
        }

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

        // Collect all matches in an ordered array
        if ($numMatches != 0) {
            for ($i = 0; $i <= $numMatches - 1; $i++) {
                $docIDs[$i] = $query['hits']['hits'][$i]['_id'];
                $authors[$i] = $query['hits']['hits'][$i]['_source']['author'];
                $titles[$i] = $query['hits']['hits'][$i]['_source']['book'];

                $results[$i] = ['author' => $authors[$i], 'title' => $titles[$i], 'docID' => $docIDs[$i]];
            }
        }

        return $this->responseWithJson($response, ['searchString' => $keyword,  'results' => $results, 'serverTime' => $now, 'status' => $status]);
    }
}

