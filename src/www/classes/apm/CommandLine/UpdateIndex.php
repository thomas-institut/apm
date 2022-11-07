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

class UpdateIndex extends IndexDocs
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

        // Get list of index entries (by ID) to be updated (THE IDS SHOULD GENERA$idTED OUT OF A OPENSEARCH QUERY FOR ALL ENTRIES (SEE APISEARCH) AND/OR A POLLING ALGORITHM FOR CHANGES IN THE SQL DATABASE)

        // TEST
        // if (transcription is changed)
        $IDs = [0, 1];
        $lang = 'he';
        $transcript = "Hic forum est.";
        $transcript_clean = $this->encode($transcript);

        echo("Lemmatizing in Python...");
        exec("python3 ../../python/Lemmatizer_Indexing.py $lang $transcript_clean", $tokens_and_lemmata);

        // Get tokenized and lemmatized transcript
        $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
        $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);

        // Update index
        foreach ($IDs as $id) {
            $this->client->update([
                'index' => $this->indexName,
                'id' => $id,
                'body' => [
                    'transcript' => $transcript,
                    'transcript_tokens' => $transcript_tokenized,
                    'transcript_lemmata' => $transcript_lemmatized
                ]
            ]);

        }

        // if (new transcription is created) - DOCID AND PAGE NEEDED!


        // Get title of every document
        $doc_info = $this->dm->getDocById($doc_id);
        $title = ($doc_info['title']);

        // Get pageID, number of columns and sequence number of the page
        $page_id = $this->dm->getpageIDByDocPage($doc_id, $page);
        $page_info = $this->dm->getPageInfo($page_id);
        $num_cols = $page_info['num_cols'];
        $seq = $page_info['seq'];

        // Iterate over all columns of the page and get the corresponding transcripts and transcribers
        for ($col = 1; $col <= $num_cols; $col++) {
            $versions = $this->dm->getTranscriptionVersionsWithAuthorInfo($page_id, $col);
            if (count($versions) === 0) {
                // no transcription in this column
                continue;
            }
            $elements = $this->dm->getColumnElementsBypageID($page_id, $col);
            $transcript = $this->getPlainTextFromElements($elements);
            $transcriber = $versions[0]['author_name'];

            // Get language of current column (same as document)
            $lang = $this->dm->getPageInfoByDocSeq($doc_id, $seq)['lang'];

            // Get foliation number of the current page/sequence number
            $foliation = $this->dm->getPageFoliationByDocSeq($doc_id, $seq);

            // Add data to the OpenSearch index with a unique id
            $id = $id + 1;

            $this->indexCol($id, $title, $page, $seq, $foliation, $col, $transcriber, $page_id, $doc_id, $transcript, $lang);
            print("$id: Doc $doc_id ($title) page $page seq $seq foliation $foliation col $col lang $lang\n");

        }
        return true;
    }
}
