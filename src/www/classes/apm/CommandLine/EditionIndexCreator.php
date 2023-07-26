<?php

namespace APM\CommandLine;

use APM\Api\ApiWorks;
use APM\System\ApmConfigParameter;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;

use function DI\string;

class EditionIndexCreator extends IndexCreator
{
    // Variables for OpenSearch client and the name of the index to create
    public Client $client;
    public array $index_names;
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

        // Name of the indices in OpenSearch
        $this->index_names = ['editions_la', 'editions_ar', 'editions_he'];

        // Delete existing and create new indices
        foreach ($this->index_names as $index_name) {
            if ($this->client->indices()->exists(['index' => $index_name])) {
                $this->client->indices()->delete([
                    'index' => $index_name
                ]);
                $this->logger->debug("Existing index *$index_name* was deleted!\n");
            };

            $this->client->indices()->create([
                'index' => $index_name,
                'body' => [
                    'settings' => [
                        'index' => [
                            'max_result_window' => 50000
                        ]
                    ]
                ]
            ]);

            $this->logger->debug("New index *$index_name* was created!\n");
        }

        $editions = [];

        // Get the data of up to 20000 editions
        for ($id=1; $id<20000; $id++) {

            try {
                $editions[] = $this->getEditionData($id);
            } catch (\Exception $e) {
                $num_editions = $id-1;
                $this->logger->debug("Found $num_editions potential editions.");
                break;
            }
        }

        // CLEAN DATA
        // Remove empty editions
        foreach ($editions as $i=>$edition) {
            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        // Assign proper keys to editions and get number of non-empty editions
        $editions = array_values($editions);
        $num_editions = count($editions);
        $this->logger->debug("Found $num_editions actual editions.");


        // Get edition data for indexing
        foreach ($editions as $id => $edition) {
            $editor = $edition['editor'];
            $text = $edition['text'];
            $title = $edition['title'];
            $chunk = $edition['chunk_id'];
            $lang = $edition['lang'];
            $table_id = $edition['table_id'];
            $work = $edition['work'];
            
            if ($lang != 'jrb') {
                $index_name = 'editions_' . $lang;
            }
            else {
                $index_name = 'editions_he';
            }

            $this->indexEdition ($index_name, $id, $editor, $text, $title, $chunk, $lang, $table_id, $work);
            $this->logger->debug("Indexed Edition in $index_name – OpenSearch ID: $id, Editor: $editor, Title: $work, Chunk: $chunk, Lang: $lang, Table ID: $table_id\n");

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
            $editor_id = $this->ctable->getCollationTableVersionManager()->getCollationTableVersionInfo($id, 1)[0]->authorId;
            $editor = $this->um->getUserInfoByUserId($editor_id)['fullname'];

            $edition_text = "";

            foreach ($tokens as $token) {
                if ($token['tokenType'] !== 'empty') {
                    $edition_text = $edition_text . " " . $token['text'];
                }
            }

            $edition_data['editor'] = $editor;
            $edition_data['text'] = $edition_text;
            $edition_data['title'] = $data['title'];
            $edition_data['lang'] = $data['lang'];
            $edition_data['chunk_id'] = explode('-', $data['chunkId'])[1];
            $work_id = explode('-', $data['chunkId'])[0];
            $edition_data['work'] = $this->dm->getWorkInfo($work_id)['title'];

        }

        return $edition_data;
    }

    protected function indexEdition (string $index_name, int $id, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id, string $work): bool
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
            'index' => $index_name,
            'id' => $id,
            'body' => [
                'page' => '1',
                'seq' => $table_id,
                'foliation' => $chunk,
                'column' => '',
                'pageID' => '1',
                'docID' => '1',
                'transcriber' => $editor,
                'title' => $work,
                'chunk'=> $chunk,
                'lang' => $lang,
                'transcript_tokens' => $text_tokenized,
                'transcript_lemmata' => $text_lemmatized
            ]
        ]);

        return true;
    }
    
}