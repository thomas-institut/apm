<?php

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use OpenSearch\ClientBuilder;

class IndexedDocumentDeleter extends TranscriptionsIndexer
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
        $this->indexName = '';

        // ID of the document to delete
        $id = 20000;

        // Delete a single document
        $this->client->delete([
            'index' => $this->indexName,
            'id' => $id,
        ]);

        print ("Document with ID $id was deleted from index *$this->indexName*.\n");

        return true;
    }
}