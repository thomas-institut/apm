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

        foreach ($docs as $doc) {
            // Get a list of transcribed pages of the document
            $pages_transcribed = $this->getDm()->getTranscribedPageListByDocId($doc);

            foreach ($pages_transcribed as $page) {
                
                $page_id = $this->getPageID($doc, $page);
                $page_info = $this->getDm()->getPageInfo($page_id);
                $num_cols = $page_info['num_cols'];

                for ($col = 1; $col <= $num_cols; $col++) {

                    $versions = $this->getDm()->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }

                    // Get timestamp
                    $versionsInfo = $versionManager->getColumnVersionInfoByPageCol($page_id, $col);
                    $currentVersionInfo = (array)(end($versionsInfo));
                    $timeFrom = (string)$currentVersionInfo['timeFrom'];
                    
                    $columnsInDatabase[] = [$page_id, $col, $timeFrom];
                    print(".");
                }
            }
        }

        $numColumnsInDatabase = count($columnsInDatabase);

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
                $timeFrom = $match['_source']['time_from'];
                $indexedColumns[] = [$page_id, $col, $timeFrom];
            }
        }

        // check if every column from the database is indexed in the most up-to-date version

        print("\nComparing transcriptions in database and opensearch index...\n");

        $numNotIndexedColumns = 0;
        $numNotUpdatedColumns = 0;
        $numNotInDatabaseColumns = 0;
        $notInDatabaseColumns = [];
        $notUpdated = false;

        foreach ($columnsInDatabase as $columnInDatabase) {

            if (!in_array($columnInDatabase, $indexedColumns)) {
                $numNotIndexedColumns++;

                //print("Column $columnInDatabase[1] from page with id  $columnInDatabase[0] is NOT UPDATED ($columnInDatabase[2] != ).\n");

                    foreach ($indexedColumns as $indexedColumn) {
                        if (array_slice($columnInDatabase, 0, 2) === array_slice($indexedColumn, 0, 2)) {
                            print("Column $columnInDatabase[1] from page with id $columnInDatabase[0] is NOT UPDATED ($columnInDatabase[2] != $indexedColumn[2]).\n");
                            $numNotIndexedColumns--;
                            $numNotUpdatedColumns++;
                            $notUpdated = true;
                        }
                    }

                if (!$notUpdated) {
                    print("Column $columnInDatabase[1] from page with id $columnInDatabase[0] is NOT INDEXED.\n");
                }
            }
        }

        foreach ($indexedColumns as $indexedColumn) {
            if (!in_array($indexedColumn, $columnsInDatabase)) {
                $numNotInDatabaseColumns++;
                $notInDatabaseColumns[] = $indexedColumn[0];
            }
        }

        if ($numNotIndexedColumns === 0 && $numNotUpdatedColumns === 0) {
            print ("INDEX IS COMPLETE!.\n");
        } else {
            print ("INDEX IS NOT COMPLETE!\n
            $numNotIndexedColumns of $numColumnsInDatabase columns are not indexed.\n
            $numNotUpdatedColumns of $numColumnsInDatabase are not up to date.\n");
        }

        if ($numNotInDatabaseColumns !== 0) {
            print("\nINFO: The index contains $numNotInDatabaseColumns columns which could not be found in the database. Their page ids are:\n");
            print(implode(", ", $notInDatabaseColumns));
        }

        return true;
    }
}