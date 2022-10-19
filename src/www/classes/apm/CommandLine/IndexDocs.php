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
use PHPUnit\Util\Exception;
use ThomasInstitut\TimeString\TimeString;

/**
 * Description of IndexDocs
 *
 * Command line utility, which indexes all transcripts out of the sql-database by using methods of the DataManager class
 *
 * @author Lukas Reichert
 */

class IndexDocs extends CommandLineUtility {

    private Client $client;
    private string $indexName;

    public function main($argc, $argv): bool
    {
        // Instantiate OpenSearch client
        $this->client =  (new ClientBuilder())
            ->setHosts($this->config[ApmConfigParameter::OPENSEARCH_HOSTS])
            ->setBasicAuthentication($this->config[ApmConfigParameter::OPENSEARCH_USER], $this->config[ApmConfigParameter::OPENSEARCH_PASSWORD])
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $this->indexName = 'transcripts';


        // Delete existing and create new index
        if ($this->client->indices()->exists([
            'index' => $this->indexName])
        ) {
            $this->client->indices()->delete([
                'index' => $this->indexName
            ]);
            print("Existing index *$this->indexName* was deleted!\n");
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

        print("New index *$this->indexName* was created!\n");


        // Get a list of all docIDs in the sql-database
        $docList = $this->dm->getDocIdList('title');

        // Ascending ID for OpenSearch entries
        $id = 0;

        // Download language models for lemmatization
        exec("python3 ../../python/download_models.py", $models_status);
        print($models_status[0]);

        print("\nStart indexing...\n");

        // Iterate over all docIDs
        foreach ($docList as $docID) {
            // Get title of every document$transcript_clean
            $docInfo = $this->dm->getDocById($docID);
            $title = ($docInfo['title']);

            // Get a list of pageIDs with transcriptions
            $transPages = $this->dm->getTranscribedPageListByDocId($docID);

            // Iterate over transcribed pages

            foreach ($transPages as $page) {

                // Get pageID and number of columns of the page
                $pageID = $this->dm->getpageIDByDocPage($docID, $page);
                $pageInfo = $this->dm->getPageInfo($pageID);
                $numCols = $pageInfo['num_cols'];

                // Iterate over all columns of the page and get the corresponding transcripts and transcribers
                for ($col = 1; $col <= $numCols; $col++) {
                    $versions = $this->dm->getTranscriptionVersionsWithAuthorInfo($pageID, $col);
                    if (count($versions) === 0) {
                        // no transcription in this column
                        continue;
                    }
                    $elements = $this->dm->getColumnElementsBypageID($pageID, $col);
                    $transcript = $this->getPlainTextFromElements($elements);
                    $transcriber = $versions[0]['author_name'];

                    // Get language of current column (document) - IS IT OK, THAT THE SEQ-ARGUMENT IS ALWAYS 1?
                    $lang = $this->dm->getPageInfoByDocSeq($docID, 1)['lang'];

                    // Add columnData to the OpenSearch index with a unique ID
                    $id = $id + 1;

                    // IF-CLAUSE ONLY FOR TESTING
                    // 10672: Doc 92 (M-VA-VAT-BAV-Pal.lat.1035) page 13 col 1 lang la
                    //if ($lang === 'he' and $page === '328' and $docID === '17') {
                        $this->indexCol($id, $title, $page, $col, $transcriber, $pageID, $docID, $transcript, $lang);
                        print("$id: Doc $docID ($title) page $page col $col lang $lang\n");
                    //}
                }
            }
        }
    return true;
    }

    // Function to get plaintext of the transcripts in the sql-database (copied from the ApiTranscription class)
    private function getPlainTextFromElements($elements) : string {
        $text = '';
        foreach($elements as $element) {
            if ($element->type === Element::LINE) {
                foreach($element->items as $item) {
                    switch($item->type) {
                        case Item::TEXT:
                        case Item::HEADING:
                        case Item::RUBRIC:
                        case Item::BOLD_TEXT:
                        case Item::ITALIC:
                        case Item::MATH_TEXT:
                        case Item::GLIPH:
                        case Item::INITIAL:
                            $text .= $item->theText;
                            break;

                        case Item::NO_WORD_BREAK:
                            $text .= '-';
                            break;


                    }
                }
                $text .=  "\n";
            }
        }
        return $text;
    }

    // Function to add pages to the OpenSearch index
    private function indexCol ($id, $title, $page, $col, $transcriber, $pageID, $docID, $transcript, $lang): bool
    {

        // Encode transcript for avoiding errors in shell command because of characters like "(", ")" or " "
        $transcript_clean = $this->encode($transcript);
#
         // Tokenization and Lemmatization
        if (strlen($transcript_clean) > 3) {
                echo ("Lemmatizing in Python...");
                exec("python3 ../../python/Lemmatizer_Indexing.py $transcript_clean", $tokens_and_lemmata);
                $transcript_tokenized = explode("#", $tokens_and_lemmata[0]);
                $transcript_lemmatized = explode("#", $tokens_and_lemmata[1]);
                //print ($transcript_clean);
            }
            else {
                $transcript_tokenized = [];
                $transcript_lemmatized = [];
                echo ("Transcript is too short for lemmatization...");
            }
            if (count($transcript_tokenized) !== count($transcript_lemmatized)) {
                print("Error! Array of tokens and lemmata do not have the same length!\n");
                print_r($transcript_tokenized);
                print_r($transcript_lemmatized);
            }
            else {
                print_r("finished!\n");
            }

        $this->client->create([
            'index' => $this->indexName,
            'id' => $id,
            'body' => [
                'title' => $title,
                'page' => $page,
                'column' => $col,
                'pageID' => $pageID,
                'docID' => $docID,
                'lang' => $lang,
                'transcriber' => $transcriber,
                'transcript' => $transcript,
                'transcript_tokens' => $transcript_tokenized,
                'transcript_lemmata' => $transcript_lemmatized
            ]
        ]);

        return true;
    }

    private function encode($transcript) {
        $transcript_clean = str_replace("\n", "#", $transcript);
        $transcript_clean = str_replace(" ", "#", $transcript_clean);
        $transcript_clean = str_replace("(", "%", $transcript_clean);
        $transcript_clean = str_replace(")", "§", $transcript_clean);
        $transcript_clean = str_replace("׳", "€", $transcript_clean);
        $transcript_clean = str_replace("'", "\'", $transcript_clean);
        $transcript_clean = str_replace("\"", "\\\"", $transcript_clean);
        $transcript_clean = str_replace(' ', '#', $transcript_clean);
        $transcript_clean = str_replace(' ', '#', $transcript_clean);
        $transcript_clean = str_replace('##', '#', $transcript_clean);


        return $transcript_clean;
    }
}
