<?php

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;

class EditionIndexCreator extends IndexCreator
{
    // Variables for OpenSearch client and the name of the index to create
    public Client $client;
    public string $indexName;
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
                $num_editions = $id-1;
                $this->logger->debug("Found $num_editions potential editions.");
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
        $num_editions = count($editions);
        $this->logger->debug("Found $num_editions actual editions.");


        foreach ($editions as $id => $edition) {
            $text = $edition['text'];
            $title = $edition['title'];
            $chunk = $edition['chunk_id'];
            $lang = $edition['lang'];

            $this->indexEdition ($id, $text, $title, $chunk, $lang);
            $this->logger->debug("Indexed Edition – OpenSearch ID: $id, Title: $title, Chunk: $chunk, Lang: $lang\n");

        }

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
            $edition_data['title'] = $data['title'];
            $edition_data['chunk_id'] = $data['chunkId'];
            $edition_data['lang'] = $data['lang'];

        }

        return $edition_data;
    }

    protected function indexEdition (int $id, string $text, string $title, string $chunk, string $lang): bool
    {
        // Encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $text_clean = $this->encode($text);

        // Tokenization and lemmatization
        // Test existence of text and tokenize/lemmatize existing texts in python
        if (strlen($text_clean) > 3) {
            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_clean", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $text_tokenized = explode("#", $tokens_and_lemmata[0]);
            $text_lemmatized = explode("#", $tokens_and_lemmata[1]);
        }
        else {
            $text_tokenized = [];
            $text_lemmatized = [];
            $this->logger->debug("Text is too short for lemmatization...");
        }
        if (count($text_tokenized) !== count($text_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
        }

        // Data to be stored on the OpenSearch index
        $this->client->create([
            'index' => $this->indexName,
            'id' => $id,
            'body' => [
                'title' => $title,
                'chunk'=> $chunk,
                'lang' => $lang,
                'text_tokens' => $text_tokenized,
                'text_lemmata' => $text_lemmatized
            ]
        ]);

        return true;
    }
    
}