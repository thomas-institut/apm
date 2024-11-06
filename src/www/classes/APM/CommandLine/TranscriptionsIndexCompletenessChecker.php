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

        // get versionManager
        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();

        // Get a list of triples with data about all transcribed columns, their pageIDs and their timestamps from the database

        print("Allocating transcriptions from database");
        $columnsInDatabase = [];
        
        $docs = $this->getDm()->getDocIdList('title');

        foreach (array_slice($docs, 0, 1) as $doc) {

            // Get a list of transcribed pages of the document
            $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc);

            foreach ($pages_transcribed as $page) {
                
                $page_id = $this->getPageID($doc, $page);
                $page_info = $this->getDm()->getPageInfo($page_id);
                $num_cols = $page_info['num_cols'];

                for ($col = 1; $col <= $num_cols; $col++) {

                    // Get timestamp
                    $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    $currentVersionInfo = (array)(end($versionsInfo));
                    $timeFrom = (string)$currentVersionInfo['timeFrom'];
                    
                    $columnsInDatabase[] = [$page_id, $col, $timeFrom];
                    print(".");
                }
            }
        }

        // Get all relevant data from the opensearch index

        print("\nAllocating transcriptions from opensearch index...");
        $indexedColumns = [];
        
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
                $page_id = $match['_source']['pageID'];
                $col = $match['_source']['column'];
                $timeFrom = $match['_source']['timeFrom'];
                $indexedColumns[] = [$page_id, $col, $timeFrom];
            }
        }

        // check if every column from the database is indexed in the most up-to-date version

        print("\nComparing transcriptions in database and opensearch index...\n");
        $notIndexedColumns = [];

        foreach ($columnsInDatabase as $columnInDatabase) {
            if (!in_array($columnInDatabase, $indexedColumns)) {
                $notIndexedColumns[] = $columnInDatabase;
            }
        }

        if ($notIndexedColumns === []) {
            print ("INDEX IS COMPLETE!.\n");
        } else {
            print ("Index is NOT COMPLETE!\n" . count($notIndexedColumns) . " of " . count($columnsInDatabase) .
                    " columns are not yet indexed or not up to date. Namely (Page ID, Column, TimeFrom):\n");
            print_r($notIndexedColumns);
        }

        return true;
    }
}