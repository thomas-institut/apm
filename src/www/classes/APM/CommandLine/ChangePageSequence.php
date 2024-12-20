<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

use APM\System\Document\Exception\DocumentNotFoundException;

/**
 * Class RevertPageSequence
 *
 * Command line utility to revert the page sequence number of a page interval
 *
 * E.g. in a document with pages with sequences 1 to 100, reverting the
 * sequences of pages 81 to 100 yields the following sequences:
 *    Pages 1 to 80 ==>  1, 2, ... 79,80  (i.e., no change)
 *    Pages 81 to 100 ==>  page 81 = seq 100, 82 = 99, 83 = 98, ... 100 = 81
 *
 * Running the utility again with the same parameters restores the original sequence
 *
 *
 * @package APM\CommandLine
 */
class ChangePageSequence extends CommandLineUtility
{

    const USAGE = "USAGE:  changepagesequence --docId <id> [ --reset | --reverse <from>-<to>]\n";
    public function main($argc, $argv)
    {
        $options = getopt('', ['docId:', 'reverse:', 'reset', 'doIt'], $index);

        if (!isset($options['docId'])) {
            $this->printErrorMsg("Need a document Id");
            $this->printStdErr(self::USAGE);
            return false;
        }

        $docId = isset($options['docId']) ? intval($options['docId']) : -1;
        if ($docId === 0) {
            $this->printErrorMsg("Invalid docId, expected a positive integer, got '" . $options['docId'] . "'");
            $this->printStdErr(self::USAGE);
            return false;
        }

        $docManager = $this->getSystemManager()->getDocumentManager();

        try {
            $docInfo = $docManager->getLegacyDocInfo($docId);
        } catch (DocumentNotFoundException) {
            $this->printErrorMsg("Given docId $docId does not exist.");
            return false;
        }

        $this->printStdErr("Doc Id $docId:  " . $docInfo['title'] . "\n");

        try {
            $docPageCount = $docManager->getDocPageCount($docId);
        } catch (DocumentNotFoundException $e) {
            $this->printErrorMsg("Cannot get page count for document.");
            return false;
        }

        if ($docPageCount === 0) {
            $this->printStdErr("No pages in document, nothing to do.\n");
            return true;
        }


        $pageFrom = 0;
        $pageTo = 0;
        $reverse = false;
        $pageSequence = $this->generateDefaultPageSequence($docPageCount);
        if (isset($options['reset'])) {
            $this->printStdErr("Resetting page sequence for all pages in document: 1 to $docPageCount\n");
        } else {
            if (!isset($options['reverse'])) {
                $this->printErrorMsg("Need either '--reset' or '--reverse [pageRange]' to do something");
                return false;
            }
            $reverse = true;
            $pageRange = $options['reverse'];
            [ $pageFrom , $pageTo] = explode('-', $pageRange);
            $pageFrom = intval($pageFrom);
            $pageTo = intval($pageTo);

            if ($pageFrom === 0 || $pageTo === 0 || $pageFrom >= $pageTo) {
                $this->printErrorMsg("Invalid page range, must be something like '--reverse 10-20'");
                return false;
            }
            if ($pageTo > $docPageCount) {
                $this->printErrorMsg("Invalid page range, this document only has $docPageCount pages.");
                return false;
            }
            $this->printStdErr("Reversing page sequence for pages $pageFrom to $pageTo, all other pages will be reset to normal order.\n");
            $pageSequence = $this->reverseInterval($pageSequence, $pageFrom, $pageTo);
        }

        $doIt = isset($options['doIt']);
        if (!$doIt) {
            $this->printStdErr("Dry run, not changing anything on the database!  Use '--doIt' to make changes.\n");
        }

        $thereAreChanges = false;
        foreach($pageSequence as $seq) {
            $pageInfo = $this->getDm()->getPageInfoByDocPage($docId, $seq['page']);
            if ($pageInfo['seq'] === $seq['seq']) {
                continue;
            }
            $thereAreChanges = true;
            $this->printStdErr("Changing sequence for page " . $seq['page'] . " from " . $pageInfo['seq'] . " to " . $seq['seq'] . "\n");
            if ($doIt) {
                $pageInfo['seq'] = $seq['seq'];
                $this->getDm()->updatePageSettings($pageInfo['id'], $pageInfo);
            }
        }

        if (!$thereAreChanges) {
            $this->printStdErr("No changes are necessary.\n");
        }
        return true;
    }

    private function generateDefaultPageSequence(int $pageCount) : array {
        $seqArray = [];
        for ($i = 0; $i< $pageCount; $i++) {
            $seqArray[] = [ 'page' => $i+1, 'seq' => $i+1];
        }
        return $seqArray;
    }

    private function reverseInterval(array $seqArray, int $from, int $to) : array {
        for ($i = $from; $i<= $to; $i++) {
            $seqArray[$i-1] = [ 'page' => $i, 'seq' => $to - ($i - $from) ];
        }
        return $seqArray;
    }
}