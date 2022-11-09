<?php


/*
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

namespace APM\CommandLine;

use APM\System\ApmConfigParameter;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;

/**
 * Description of UpdateIndex
 *
 * Commandline utility to update the index of all transcripts in OpenSearch
 *
 * @author Lukas Reichert
 */

class IndexUpdater extends IndexCreater
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
        $this->indexName = 'transcripts';

        // Download hebrew language model for lemmatization
        exec("python3 ../../python/download_model_he.py", $model_status);
        print($model_status[0]);

        print("\nStart updating index...\n");

        // Get data from the scheduling table in sql
        // TEST DATA
        $doc_id = "153";
        $page = "79";
        $col = "1";

        // Get all indexing-relevant data

        $title = $this->getTitle($doc_id);
        $seq = $this->getSeq($doc_id, $page);
        $foliation = $this->getFoliation($doc_id, $page);
        $transcriber = $this->getTranscriber($doc_id, $page, $col);
        $page_id = $this->getPageID($doc_id, $page);
        $lang = $this->getLang($doc_id, $page);
        $transcript = $this->getTranscript ($doc_id, $page, $col);

        // First Case: New transcription was created

        // Get highest OpenSearch index id
        $current_id = 11500; // Test
        $id = $current_id + 1;

        // Add new transcription to index
        $this->indexCol($id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
        print("$id: Doc $doc_id ($title) page $page seq $seq foliation $foliation col $col lang $lang\n");

        // Second Case: Existing transcription was changed

        // Tokenize and lemmatize new transcription
        echo("Lemmatizing in Python...");
        $transcript_clean = $this->encode($transcript);
        exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcript_clean", $tokens_and_lemmata);

        // Get tokenized and lemmatized transcript
        $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
        $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);

        // Update index
        $this->client->update([
            'index' => $this->indexName,
            'id' => $id,
            'body' => [
                'transcript' => $transcript,
                'transcript_tokens' => $transcript_tokenized,
                'transcript_lemmata' => $transcript_lemmatized
            ]
        ]);

        return true;
    }
}
