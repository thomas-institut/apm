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

use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;
use ThomasInstitut\TimeString\TimeString;

require '/home/lukas/apm/vendor/autoload.php';

/**
 * Description of IndexDocs
 *
 * Command line utility, which indexes all transcripts out of the sql-database by using methods of the DataManager class
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class IndexDocs extends CommandLineUtility {

    public function main($argc, $argv)
    {
        // Instantiate OpenSearch client

        $GLOBALS['client'] = (new \OpenSearch\ClientBuilder())
            ->setHosts(['https://localhost:9200'])
            ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        // Name of the index in OpenSearch
        $GLOBALS['indexName'] = 'transcripts';

        // Clear existing index and create new index
        $GLOBALS['client']->indices()->delete([
            'index' => $GLOBALS['indexName']
        ]);

        $GLOBALS['client']->indices()->create([
            'index' => $GLOBALS['indexName']
        ]);

        // Get a list of all docIDs in the sql-database
        $docList = $this->dm->getDocIdList('title');

        // Ascending ID for OpenSearch enries
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
                    $elements = $this->dm->getColumnElementsBypageID($pageID, $col);
                    $transcript = $this->getPlainTextFromElements($elements);
                    $transcriber = $this->dm->getTranscriptionVersionsWithAuthorInfo($pageID, $col)[0]['author_name']; // !?Is here an error, when building the index!?

                    // Add columnData to the OpenSearch index with a unique ID
                    $id = $id + 1;
                    $this->indexCol($id, $title, $page, $col, $transcriber, $pageID, $docID, $transcript);
                    echo "OK.";
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
    private function indexCol ($id, $title, $page, $col, $transcriber, $pageID, $docID, $transcript) {

        $GLOBALS['client']->create([
            'index' => $GLOBALS['indexName'],
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