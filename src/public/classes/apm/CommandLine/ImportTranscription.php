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

use APM\FullTranscription\ColumnVersionInfo;
use AverroesProject\ColumnElement\Element;
use AverroesProject\Data\DataManager;
use AverroesProject\TxText\Item;
use Exception;
use InvalidArgumentException;

use ThomasInstitut\TimeString\TimeString;
use function json_decode;
use function json_encode;

class ImportTranscription extends CommandLineUtility
{

    const USAGE = "usage: importranscription --userId <userId> --docId <docId> [--pageMap <70v=1,71r=2,...||<1=125++10>] [--pageMapFile <filename>] [<json filename>]
    pageMap: inputPage=apmPage++lastInputPage
";

    protected function main($argc, $argv)
    {

        error_reporting(E_ALL & ~E_WARNING);

        $fileName = 'php://stdin';
        $userId = -1;
        $docId = -1;
        $pageMapFileName = '';
        $pageMapString = '';
        $options = getopt('', ['userId:', 'docId:', 'pageMap:', 'pageMapFile:', 'dryRun'], $index);
        $userId = isset($options['userId']) ? intval($options['userId']) : -1;
        $docId = isset($options['docId']) ? intval($options['docId']) : -1;
        $dryRun = isset($options['dryRun']);
        if ($index < count($argv)) {
            $fileName = $argv[$index];
        }

        // check page map
        if (isset($options['pageMap'])) {
            $pageMapString = $options['pageMap'];
        }
        if (isset($options['pageMapFile'])) {
            $pageMapFileName = $options['pageMapFile'];
            $pageMapString = file_get_contents($pageMapFileName);
            if ($pageMapString === false) {
                $this->printErrorMsg("Cannot read page map file '$pageMapFileName'");
                return false;
            }
        }

        try {
            $pageMap = $this->getPageMapFromString($pageMapString);
        } catch (Exception $e) {
            $this->printErrorMsg($e->getMessage());
            return false;
        }

        // check user
        if ($userId <= 0) {
            $this->printErrorMsg('Invalid User Id');
            $this->printStdErr(self::USAGE);
            return false;
        }

        $userManager = $this->dm->userManager;

        $userInfo = $userManager->getUserInfoByUserId($userId);
        if ($userInfo === false) {
            $this->printErrorMsg("Given user Id does not exist");
            return false;
        }

        // check document
        if ($docId <= 0) {
            $this->printErrorMsg('Invalid document Id');
            $this->printStdErr(self::USAGE);
            return false;
        }
        $docInfo = $this->dm->getDocById($docId);
        if ($docInfo === false) {
            $this->printErrorMsg("Given document Id does not exist");
            return false;
        }




        $json = file_get_contents($fileName);

        if ($json === false) {
            $this->printErrorMsg("Can't read file '$fileName'");
            return false;
        }

        $data = json_decode($json, true);

        if ($data === null) {
            $this->printErrorMsg("Cannot decode json in '$fileName'");
            return false;
        }

        $this->logger->info("Importing " . count($data) .
            " columns into document $docId (" . $docInfo['title'] . ")" .
            " using userId $userId (" . $userInfo['username'] . ")" .  ($dryRun ?  ' DRY RUN ' : '') . "\n");

        $updateTime = TimeString::now();

        foreach($data as $columnData) {
            $givenPage = $columnData['page'];
            $mappedPage = isset($pageMap[$givenPage]) ? $pageMap[$givenPage] : $givenPage;
            $col = intval($columnData['column']);
            if ($givenPage !== $mappedPage) {
                $this->logger->info("Page $givenPage ( = $mappedPage) col $col \n");
            } else {
                $this->logger->info("Page $givenPage col $col \n");
            }
            $pageId = $this->dm->getPageIdByDocSeq($docId, $mappedPage);
            if ($pageId === false) {
                $this->logger->error("  ERROR: page $mappedPage does not exist\n");
            } else {
                $this->logger->debug("  pageId = $pageId\n");
            }
            // prepare element data
            $newElementsData = [];
            if (count($columnData['data']['elements']) === 0) {
                $this->logger->debug("No elements for page $givenPage col $col, ignoring");
                continue;
            }

            $errorInElement = false;
            foreach($columnData['data']['elements'] as $element) {
                $newElement = $element;
                $newElement['pageId'] = $pageId;
                $newElement['editorId'] = $userId;
                if ($newElement['type'] !== Element::LINE_GAP &&  count($newElement['items']) === 0) {
                    if ($newElement['type'] === Element::LINE) {
                        $this->logger->info("  Found empty line, ignoring");
                    } else {
                        $this->logger->error("  ERROR: empty element found", [ 'element' => $newElement] );
                        $errorInElement = true;
                    }
                    continue;
                }
                $newElementsData[] = $newElement;
            }
            if ($errorInElement) {
                continue;
            }

            $pageInfo = $this->dm->getPageInfo($pageId);
            if ($col > $pageInfo['num_cols']) {
                $this->logger->error("  ERROR: column $col is not defined in this page\n");
                continue;
            }


            $newElements = DataManager::createElementArrayFromArray($newElementsData);

            if ($dryRun) {
                $this->logger->info("Dry run, nothing changed in database");
            } else {
                try {
                    $newItemIds = $this->dm->updateColumnElements($pageId, $col, $newElements, $updateTime);
                } catch (Exception $e) {
                    $this->logger->error("Error updating elements: " . $e->getMessage());
                }
                //$this->logger->info("Elements updated", [ 'newItemIds' => $newItemIds]);
                // Register version
                $versionInfo = new ColumnVersionInfo();
                $versionInfo->pageId = $pageId;
                $versionInfo->column = $col;
                $versionInfo->authorId = $userId;
                $versionInfo->description = 'Imported from command line';
                $versionInfo->isMinor = false;
                $versionInfo->isReview = false;
                $versionInfo->timeFrom = $updateTime;

                try {
                    $this->systemManager->getTranscriptionManager()->getColumnVersionManager()->registerNewColumnVersion($pageId, $col, $versionInfo);
                } catch (Exception $e) {
                    $this->logger->error("Cannot register version: " . $e->getMessage());
                }
            }
        }
    }

    /**
     * Returns a page map from a page map string
     * Page map string is a list of entries delimited by whitespace
     * An entry can be:
     *    'xx=yy'   ==> page xx in the input corresponds to page yy in Apm
     *    'xx=yy++zz'  ==> page xx is page yy, xx+1 is yy+1, .... until page zz in the input
     *
     * @param $pageMapString
     * @return array
     */
    private function getPageMapFromString($pageMapString) : array {
        $entries = preg_split("/[\s,]+/", $pageMapString);
        $map = [];
        foreach($entries as $entry) {
            if ($entry === '') {
                continue;
            }
            $fields = explode('=', $entry);
            if (count($fields) !== 2) {
                throw new InvalidArgumentException("Invalid entry in page Map: '$entry', need something like '36r=123'");
            }
            $inputPage = $fields[0];
            $equivalentPage = $fields[1];
            $epFields = explode('++', $equivalentPage);
            if (count($epFields) === 2 && $this->isIntegerString($inputPage)) {
                //   ii=oo++ll     input = output ++ lastpage
                $firstPage = intval($inputPage);
                $equivalentPage = intval($epFields[0]);
                $lastPage = intval($epFields[1]);
                for($p = $firstPage; $p <= $lastPage; $p++) {
                    $map[$p] = $equivalentPage++;
                }
            } else {
                $map[$inputPage] = $equivalentPage;
            }
        }
        return $map;
    }

    private function isIntegerString(string $str): bool {
        return preg_match('/\d+/', $str);
    }
}