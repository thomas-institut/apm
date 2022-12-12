<?php

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;

class EditionIndexCreater extends CommandLineUtility
{
    // Variables for OpenSearch client and the name of the index to create
    protected Client $client;
    protected string $indexName;
    protected $ctable;

    public function main($argc, $argv): bool
    {
        // Get collationTableManager
        $this->ctable = $this->systemManager->getCollationTableManager();

        // Instantiate OpenSearch client
        $this->client = (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = 'editions';

        // Delete existing and create new index
        if ($this->client->indices()->exists(['index' => $this->indexName])) {
            $this->client->indices()->delete([
                'index' => $this->indexName
            ]);
            $this->logger->debug("Existing index *$this->indexName* was deleted!\n");
        };

        $this->client->indices()->create([
            'index' => $this->indexName,
            'body' => [
                'settings' => [
                    'index' => [
                        'max_result_window' => 50000
                    ]
                ]
            ]
        ]);

        $this->logger->debug("New index *$this->indexName* was created!\n");

        $editions = [];

        for ($id=1; $id<20000; $id++) {

            try {
                $editions[] = $this->getEditionData($id);
            } catch (\Exception $e) {
                $this->logger->debug("No table entry with ID $id. Process finished.");
                break;
            }
        }

        // Clean data
        foreach ($editions as $i=>$edition) {
            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        $editions = array_values($editions);

        print_r ($editions);

        return true;
    }

    private function getEditionData ($id) {

        $edition_data = [];
        $data = $this->ctable->getCollationTableById($id);

        if ($data['type'] === 'edition') {
            $edition_data['table_id'] = $id; // equals $data['tableId']
            $edition_data['edition_witness_index'] = $data['witnessOrder'][0];

            $edition_json = $data['witnesses'][$edition_data['edition_witness_index']];
            $tokens = $edition_json['tokens'];
            $edition_text = "";

            foreach ($tokens as $token) {
                if ($token['tokenType'] !== 'empty') {
                    $edition_text = $edition_text . " " . $token['text'];
                }
            }

            $edition_data['text'] = $edition_text;
            $edition_data['chunk_id'] = $data['chunkId'];
            $edition_data['fields'] = array_keys($data);
        }

        return $edition_data;
    }
}