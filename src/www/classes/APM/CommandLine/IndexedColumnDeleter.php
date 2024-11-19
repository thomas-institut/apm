<?php

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use OpenSearch\ClientBuilder;

class IndexedColumnDeleter extends TranscriptionsIndexer
{
    public function main($argc, $argv): bool
    {

        // Instantiate OpenSearch client
        $this->client = (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = $argv[0];

        // ID of the document to delete
        $pageID = $this->argv[1];
        $col = $this->argv[2];

        // Delete a single document
        $this->client->delete([
            'index' => $this->indexName,
            'pageID' => $pageID,
            'column' => $col
        ]);

        print ("Column $col from page with ID $pageID was deleted from index *$this->indexName*.\n");

        return true;
    }
}