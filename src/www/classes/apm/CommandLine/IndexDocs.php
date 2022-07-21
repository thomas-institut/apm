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
use ThomasInstitut\TimeString\TimeString;

//require '/home/lukas/apm/vendor/autoload.php';

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

        // Clear existing index and create new index
        $this->client->indices()->delete([
            'index' => $this->indexName
        ]);

        $this->client->indices()->create([
            'index' => $this->indexName
        ]);

        // Get a list of all docIDs in the sql-database
        $docList = $this->dm->getDocIdList('title');

        // Ascending ID for OpenSearch entries
        $id = 0;

        // Iterate over all docIDs
        foreach ($docList as $docID) {
            // Get title of every document
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

                    // Add columnData to the OpenSearch index with a unique ID
                    $id = $id + 1;
                    $this->indexCol($id, $title, $page, $col, $transcriber, $pageID, $docID, $transcript);
                    print("$id: Doc $docID ($title) page $page col $col\n");
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
    private function indexCol ($id, $title, $page, $col, $transcriber, $pageID, $docID, $transcript): bool
    {

        $this->client->create([
            'index' => $this->indexName,
            'id' => $id,
            'body' => [
                'title' => $title,
                'page' => $page,
                'column' => $col,
                'transcriber' => $transcriber,
                'pageID' => $pageID,
                'docID' => $docID,
                'transcript' => $transcript
            ]
        ]);

        return true;
    }
    
}