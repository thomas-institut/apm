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

use APM\Api;
use AverroesProject\ColumnElement\Element;
use AverroesProject\TxText\Item;

require '/home/lukas/apm/vendor/autoload.php';


/**
 * Description of ChangePasswordUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class IndexDocs extends CommandLineUtility {

    public function main($argc, $argv)
    {
        // Start OpenSearch client and create index

        $GLOBALS['client'] = (new \OpenSearch\ClientBuilder())
            ->setHosts(['https://localhost:9200'])
            ->setBasicAuthentication('admin', 'admin') // For testing only. Don't store credentials in code.
            ->setSSLVerification(false) // For testing only. Use certificate for validation
            ->build();

        $GLOBALS['indexName'] = 'transcripts';

        /*$GLOBALS['client']->indices()->create([
            'index' => $GLOBALS['indexName']
        ]);*/

        // Get IDs of all docs and the total number of docs
        $docList = $this->dm->getDocIdList('title');

        // Index every document in OpenSearch

        // Iterate over all docIDs
        foreach ($docList as $docID) {

         // $work = $this->dm->getWorkInfo($docID);
         // $info = $this->dm->getDocPageInfo($docID);

         // get title
            $docInfo = $this->dm->getDocById($docID);
            $title = ($docInfo['title']);

            // iterate over transcribed pages (check for columns) and get transcriber
            $transPages = $this->dm->getTranscribedPageListByDocId($docID);
            foreach ($transPages as $page) {
                $pageID = $this->dm->getpageIDByDocPage($docID, $page);
                $pageInfo = $this->dm->getPageInfo($pageID);
                $numCols = $pageInfo['num_cols'];

                if ($numCols === 1) {
                    $elements = $this->dm->getColumnElementsBypageID($pageID, $numCols);
                    $transcript = $this->getPlainTextFromElements($elements);
                    $transcriber = $this->dm->getTranscriptionVersionsWithAuthorInfo($pageID, 1)[0]['author_name'];
                }
                // print_r ($title . "\n" . $page . "\n" . $transcriber . "\n"  $pageID . "\n" . $docID . "\n" . $transcript);
                $this->indexPage($title, $page, $transcriber, $pageID, $docID, $transcript);
                echo "Ok.";
            }
        }
    return true;
    }

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

    private function indexPage ($title, $page, $transcriber, $pageID, $docID, $transcript) {

        $GLOBALS['client']->create([
            'index' => $GLOBALS['indexName'],
            'id' => $pageID,
            'body' => [
                'title' => $title,
                'page' => $page,
                'transcriber' => $transcriber,
                'docID' => $docID,
                'transcript' => $transcript
            ]
        ]);

        return true;
    }
    
}