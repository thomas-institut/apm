<?php

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;

class EditionIndexCreator extends IndexCreator
{
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

        // Name of the indices to be created and filled in OpenSearch
        $this->indices = ['editions_la', 'editions_ar', 'editions_he'];

        // Delete existing and create new indices
        foreach ($this->indices as $index_name) {
            $this->resetIndex($this->client, $index_name);
        }

        // Get the data of up to 20000 editions
        $editions = [];
        foreach (range(1, 20000) as $id) {
            try {
                $editions[] = $this->getEditionData($id);
            } catch (\Exception $e) {
                $num_editions = $id-1;
                $this->logger->debug("Found $num_editions potential editions.");
                break;
            }
        }

        // Clean data
        $editions = $this->cleanEditionData($editions);

        // Index editions
        foreach ($editions as $id => $edition) {
            $this->indexEdition ($id, $edition['editor'], $edition['text'], $edition['title'], $edition['chunk_id'], $edition['lang'], $edition['table_id']);
            $log_data = 'Title: ' . $edition['title'] . ', Editor: ' . $edition['editor'] . ', Chunk: ' . $edition['chunk_id'];
            $this->logger->debug("Indexed Edition – $log_data\n");
        }

        return true;
    }

    private function getEditionData ($id): array
    {
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
            $edition_data['lang'] = $data['lang'];
            $edition_data['chunk_id'] = explode('-', $data['chunkId'])[1];
            $work_id = explode('-', $data['chunkId'])[0];
            $edition_data['title'] = $this->dm->getWorkInfo($work_id)['title'];

        }

        return $edition_data;
    }

    protected function indexEdition (int $id, string $editor, string $text, string $title, string $chunk, string $lang, int $table_id): bool
    {
        // Get name of the target index
        if ($lang != 'jrb') {
            $index_name = 'editions_' . $lang;
        }
        else {
            $index_name = 'editions_he';
        }

        // Encode text for avoiding errors in exec shell command because of characters like "(", ")" or " "
        $text_clean = $this->encodeForLemmatization($text);

        // Tokenization and lemmatization
        // Test existence of text and tokenize/lemmatize existing texts in python
        if (strlen($text_clean) > 3) {
            exec("python3 ../../python/Lemmatizer_Indexing.py $lang $text_clean", $tokens_and_lemmata);

            // Get tokenized and lemmatized transcript
            $edition_tokenized = explode("#", $tokens_and_lemmata[0]);
            $edition_lemmatized = explode("#", $tokens_and_lemmata[1]);
        }
        else {
            $edition_tokenized = [];
            $edition_lemmatized = [];
            $this->logger->debug("Text is too short for lemmatization...");
        }
        if (count($edition_tokenized) !== count($edition_lemmatized)) {
            $this->logger->debug("Error! Array of tokens and lemmata do not have the same length!\n");
        }

        // Data to be stored on the OpenSearch index
        $this->client->create([
            'index' => $index_name,
            'id' => $id,
            'body' => [
                'table_id' => $table_id,
                'chunk' => $chunk,
                'creator' => $editor,
                'title' => $title,
                'lang' => $lang,
                'edition_tokens' => $edition_tokenized,
                'edition_lemmata' => $edition_lemmatized
            ]
        ]);

        return true;
    }

    private function cleanEditionData (array $editions): array
    {

        // Remove empty editions
        foreach ($editions as $i=>$edition) {
            if (count($edition) === 0) {
                unset ($editions[$i]);
            }
        }

        // Update keys in editions array and get number of non-empty editions
        $editions = array_values($editions);
        $num_editions = count($editions);
        $this->logger->debug("Found $num_editions actual editions.");

        return $editions;
    }
}