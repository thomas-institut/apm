<?php

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use OpenSearch\ClientBuilder;

class TranscriptionsIndexCompletenessChecker extends TranscriptionsIndexManager
{
    public function main($argc, $argv): bool
    {

        // Instantiate OpenSearch client
        $this->client = (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Get all doc_ids from the database
        $databaseIDs = $this->getDm()->getDocIdList('title');
        print ("Doc IDs in Database:\n");
        print_r ($databaseIDs);

        // Get all doc_ids from the opensearch index
        $indexedIDs = [];
        $this->indices = ['transcriptions_la', 'transcriptions_ar', 'transcriptions_he'];

        foreach ($this->indices as $indexName) {
            $query = $this->client->search([
                'index' => $indexName,
                'size' => 20000,
                'body' => [
                    "query" => [
                        "match_all" => [
                            "boost" => 1.0
                        ]
                    ],
                ]
            ]);


            foreach ($query['hits']['hits'] as $match) {
                $doc_id = $match['_source']['docID'];
                $indexedIDs[] = $doc_id;
            }
        }

        $indexedIDs = array_values(array_unique($indexedIDs));

        print ("Doc IDs in Index:\n");
        print_r ($indexedIDs);

        // check if every doc_id from the database is also in the index
        $missingDocIDs = [];

        foreach ($databaseIDs as $docID) {
            if (!in_array($docID, $indexedIDs)) {
                $missingDocIDs[] = $docID;
            }
        }

        if ($missingDocIDs === []) {
            print ("Index is complete!.\n");
        } else {
            print ("Index is not complete! The missing doc_ids are:\n");
            print_r ($missingDocIDs);
        }

        return true;
    }
}