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

class PublishTranscription extends CommandLineUtility
{

    const USAGE = "usage: publishtranscription [--dryRun] [--versionId vid] | [--docId docId --pages xx,yy,vv-zz]\n";

    protected function main($argc, $argv)
    {

        error_reporting(E_ALL & ~E_WARNING);

        $options = getopt('', ['versionId:', 'docId:', 'pages:', 'dryRun', 'invert'], $index);

        $docId = isset($options['docId']) ? intval($options['docId']) : -1;
        $dryRun = isset($options['dryRun']);
        $invert = isset($options['invert']);
        $versionId = isset($options['versionId']) ? intval($options['versionId']) : -1;
        $pagesStr = isset($options['pages']) ? $options['pages'] : '';

        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();

        if ($versionId !== -1) {
            // update single version
            try {
                $versionInfo = $versionManager->getVersionInfo($versionId);
            } catch (\Exception $e){
                $this->printErrorMsg($e->getMessage());
                return false;
            }
            if ($dryRun) {
                $this->printStdErr("Dry run, nothing updated\n");
                return true;
            }

            if ($invert) {
                $versionManager->unPublishVersion($versionId);
            } else {
                $versionManager->publishVersion($versionId);
            }
            return true;
        }

        if ($docId !== -1) {
            if ($pagesStr === '') {
                $this->printErrorMsg("Need a list of pages!");
                $this->printStdErr(self::USAGE);
                return false;
            }
        }

        $pageList =[];
        try {
            $pageList = $this->getPageListFromPageString($pagesStr);
        } catch (\Exception $e) {
            $this->printErrorMsg($e->getMessage());
            return false;
        }

        $this->printStdErr("Publishing latest column version of " . count($pageList) . " pages in document $docId\n");

        $versionManager = $this->getSystemManager()->getTranscriptionManager()->getColumnVersionManager();
        foreach($pageList as $pageNumber) {
            $this->printStdErr("Page $pageNumber:\n");
            $pageInfo = $this->getDm()->getPageInfoByDocPage($docId, $pageNumber);
            $numCols = intval($pageInfo['num_cols']);
            if ($numCols === 0) {
                $this->printStdErr("  No columns defined\n");
                continue;
            }
            for ($col = 1; $col <= $numCols; $col++) {
                $versions = $versionManager->getColumnVersionInfoByPageCol($pageInfo['id'], $col);
                if (count($versions) === 0) {
                    $this->printStdErr("  No transcriptions in column $col of $numCols\n");
                }
                foreach($versions as $versionInfo) {
                    if ($versionInfo->timeUntil === TimeString::END_OF_TIMES) {
                        // it's the last version... make sure it's published
                        if (!$versionInfo->isPublished) {
                            $this->printStdErr("  Column $col : publishing last version " .
                                "(id:" . $versionInfo->id . ", timestamp: " .
                                $versionInfo->timeFrom . ")\n");
                            $versionManager->publishVersion($versionInfo->id);
                        } else {
                            $this->printStdErr("  Column $col : last version " .
                                "(id:" . $versionInfo->id . ", timestamp: " .
                                $versionInfo->timeFrom . ") already published\n");
                        }
                    } else {
                        // not the last version, make sure it's not published
                        if ($versionInfo->isPublished) {
                            $this->printStdErr("  Column $col : unpublishing older version " .
                                "(id:" . $versionInfo->id . ", timestamp: " .
                                $versionInfo->timeFrom . ")\n");
                            $versionManager->publishVersion($versionInfo->id);
                            $versionManager->unPublishVersion($versionInfo->id);
                        }
                    }
                }
            }
        }
    }

    private function isIntegerString(string $str): bool {
        return preg_match('/^\d+$/', $str);
    }

    private function getPageListFromPageString(string $pageStr): array {
        $pageList = [];

        $entries = explode(',', $pageStr);
        foreach ($entries as $entry) {
            if ($this->isIntegerString($entry)) {
                $pageList[] = intval($entry);
                continue;
            }
            list($from, $to) = explode('-', $entry);
            if (!$this->isIntegerString($from)||!$this->isIntegerString($to)) {
                throw new \InvalidArgumentException("Invalid range in page list: $entry\n");
            }
            $from = intval($from);
            $to = intval($to);
            if ($from > $to) {
                throw new \InvalidArgumentException("Invalid range in page list: $entry\n");
            }

            for($p = $from; $p <= $to; $p++) {
                $pageList[] = $p;
            }
        }
        return $pageList;
    }
}