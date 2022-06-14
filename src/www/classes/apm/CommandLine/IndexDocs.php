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


/**
 * Description of ChangePasswordUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class IndexDocs extends CommandLineUtility {
    
    public function main($argc, $argv)
    {

        // Variables to store transcription data
        $pageId = $this->dm->getPageIdByDocPage(44, 1);
        $pageInfo = $this->dm->getPageInfo($pageId);
        $numCols = $pageInfo['num_cols'];

        // Get IDs of all docs and the total number of docs
        $docList = $this->dm->getDocIdList('title');
        $numDocs = count ($docList);

        // Index every document in OpenSearch
        /*for ($i = 0; $i < $numDocs; $i++) {
           $ID = $docList[$i];
           $author = X;
           $title = X;
           $transcriber = X;
           $pages;
           $numPages = count($pages);

           for ($i = 0; $i < $numPages; $i++) {
               if ($numCols[pages[$i]] == 1) {
                   $text[$i] = $pages[$i];
               }
           }

           $numCol = X;
           $text = [];
    }*/

        print($numCols . "\n");
        print_r ($pageInfo);
    return true;
    }
    
}