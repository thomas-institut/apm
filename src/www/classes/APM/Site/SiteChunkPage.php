<?php

/* 
 *  Copyright (C) 2019-20 Universität zu Köln
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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use APM\FullTranscription\ApmChunkSegmentLocation;
use APM\FullTranscription\ColumnVersionInfo;
use APM\System\DataRetrieveHelper;
use APM\System\User\UserNotFoundException;
use APM\System\WitnessType;
use APM\System\Work\WorkNotFoundException;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;


/**
 * Site Controller class
 *
 */
class SiteChunkPage extends SiteController
{

    const TEMPLATE_CHUNK_PAGE = 'chunk-page.twig';

    /**
     * @throws UserNotFoundException
     */
    public function singleChunkPage(Request $request, Response $response): Response
    {
       
        $dm = $this->systemManager->getDataManager();
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $ctManager = $this->systemManager->getCollationTableManager();
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $this->profiler->start();
        try {
            $workInfo = get_object_vars($this->systemManager->getWorkManager()->getWorkDataByDareId($workId));
        } catch (WorkNotFoundException $e) {
            return $this->getBasicErrorPage($response, "Error", "Work $workId not found", 404);
        }

        $witnessInfoArray = $transcriptionManager->getWitnessesForChunk($workId, $chunkNumber);
        $time =  TimeString::now();
        $savedCollationTableIds = $ctManager->getCollationTableIdsForChunk("$workId-$chunkNumber", $time);

        $savedCollationTableInfoArray = [];
        $authorsMentioned = [];
        foreach ($savedCollationTableIds as $tableId) {
            $tableVersions = $ctManager->getCollationTableVersionManager()->getCollationTableVersionInfo($tableId, 1);
            if (count($tableVersions) !== 0 ){
                $authorsMentioned[] =  $tableVersions[0]->authorTid;
                $ctInfo = $ctManager->getCollationTableInfo($tableId, $time);
                if ($ctInfo->archived) {
                    continue;
                }
                $savedCollationTableInfoArray[] = [
                    'tableId' => $tableId,
                    'authorTid' => $tableVersions[0]->authorTid,
                    'lastSave' => $tableVersions[0]->timeFrom,
                    'title' => $ctInfo->title,
                    'type' => $ctInfo->type
                    ];
            }
        }
        //$this->codeDebug("Saved collation tables", $savedCollationTableInfoArray);

        // get pages, authors and languages from witnesses
        $pagesMentioned = [];
        $languageInfoArray = [];

        foreach($witnessInfoArray as $witnessInfo) {
            switch($witnessInfo->type) {
                case WitnessType::FULL_TRANSCRIPTION:
                    $docInfo = $witnessInfo->typeSpecificInfo['docInfo'];
                    if (!isset($languageInfoArray[$docInfo->languageCode])) {
                        $languageInfoArray[$docInfo->languageCode] = $this->getLanguagesByCode()[$docInfo->languageCode];
                        $languageInfoArray[$docInfo->languageCode]['totalWitnesses'] = 0;
                        $languageInfoArray[$docInfo->languageCode]['validWitnesses'] = 0;
                    }
                    $languageInfoArray[$docInfo->languageCode]['totalWitnesses']++;
                    if ($witnessInfo->isValid) {
                        $languageInfoArray[$docInfo->languageCode]['validWitnesses']++;
                    }
                    $lastVersion = $witnessInfo->typeSpecificInfo['lastVersion'];
                    /** @var $lastVersion ColumnVersionInfo */
                    $authorsMentioned[] = $lastVersion->authorTid;
                    $pagesMentioned[] = $lastVersion->pageId;
                    $segmentArray =  $witnessInfo->typeSpecificInfo['segments'];
                    foreach ($segmentArray as $segment) {
                        /** @var $segment ApmChunkSegmentLocation */
                        $pagesMentioned[] = $segment->start->pageId;
                        $pagesMentioned[] = $segment->end->pageId;
                    }
                    break;
                default:
                    $this->logger->error('Unsupported witness type');
            }
        }

        // Fill in normalizer data for chunk page languages
        $fullLanguageInfo = [];
        foreach($languageInfoArray as $lang => $langInfo) {
            $langInfo['normalizerData'] = $this->getNormalizerData($lang, 'standard');
            $fullLanguageInfo[$lang] = $langInfo;
        }

        $helper = new DataRetrieveHelper();
        $helper->setLogger($this->logger);

        $pageInfoArray = $helper->getPageInfoArrayFromList($pagesMentioned, $transcriptionManager->getPageManager());

        $showAdminInfo = false;
        if ($this->systemManager->getUserManager()->isRoot($this->userTid)) {
            $showAdminInfo = true;
        }

        $validChunks = $this->systemManager->getDataManager()->getChunksWithTranscriptionForWorkId($workId);
        $tablesInfo = $this->systemManager->getCollationTableManager()->getTablesInfo(false, $workId);
        foreach ($tablesInfo as $tableInfo) {
            if (!in_array($tableInfo['chunkNumber'], $validChunks)) {
                $validChunks[] = $tableInfo['chunkNumber'];
            }
        }
        sort($validChunks, SORT_NUMERIC);

        $this->profiler->stop();
        $this->logProfilerData("ChunkPage-$workId-$chunkNumber");
        return $this->renderPage($response, self::TEMPLATE_CHUNK_PAGE, [
            'workId' => $workId,
            'chunkNumber' => $chunkNumber,
            'work_info' => $workInfo,
            'showAdminInfo' => $showAdminInfo,
            'witnessInfoArray' => $witnessInfoArray,
            'pageInfo' => $pageInfoArray,
            'languageInfo' => $fullLanguageInfo,
            'validChunks' => $validChunks,
            'savedCollationTables' => $savedCollationTableInfoArray
        ]);
    }


   
}
