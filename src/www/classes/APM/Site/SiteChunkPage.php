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

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\System\DataRetrieveHelper;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Transcription\ApmChunkSegmentLocation;
use APM\System\Transcription\ColumnVersionInfo;
use APM\System\User\UserNotFoundException;
use APM\System\WitnessType;
use APM\System\Work\WorkNotFoundException;
use APM\SystemProfiler;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;
use ThomasInstitut\TimeString\TimeString;


/**
 * Site Controller class
 *
 */
class SiteChunkPage extends SiteController
{
    /**
     * @throws UserNotFoundException
     * @throws PageNotFoundException
     */
    public function singleChunkPage(Request $request, Response $response): Response
    {
       
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $ctManager = $this->systemManager->getCollationTableManager();
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        SystemProfiler::setName("Site:" . __FUNCTION__ . ":$workId-$chunkNumber");
        
        try {
            $workInfo = get_object_vars($this->systemManager->getWorkManager()->getWorkDataByDareId($workId));
        } catch (WorkNotFoundException) {
            return $this->getBasicErrorPage($response, "Error", "Work $workId not found", 404);
        }

        $witnessInfoArray = $transcriptionManager->getWitnessesForChunk($workId, $chunkNumber);
        $time =  TimeString::now();
        $savedCollationTableIds = $ctManager->getCollationTableIdsForChunk("$workId-$chunkNumber", $time);

        $savedCollationTableInfoArray = [];
//        $authorsMentioned = [];
        foreach ($savedCollationTableIds as $tableId) {
            $tableVersions = $ctManager->getCollationTableVersionManager()->getCollationTableVersionInfo($tableId, 1);
            if (count($tableVersions) !== 0 ){
//                $authorsMentioned[] =  $tableVersions[0]->authorTid;
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
        $this->startCodeDebug();
        $witnessInfoArrayForPage = [];
        foreach($witnessInfoArray as $witnessInfo) {

            $witnessInfoForPage = get_object_vars($witnessInfo);

//            $this->codeDebug("Processing witness info", $witnessInfoForPage);
            try {
                $witnessInfoForPage['languageCode'] = $this->systemManager->getLangCodeFromId($witnessInfo->language);
            } catch (EntityDoesNotExistException $e) {
                // should never happen
                throw new RuntimeException($e->getMessage(), $e->getCode());
            }
            $witnessInfoArrayForPage[] = $witnessInfoForPage;

            switch($witnessInfo->type) {
                case WitnessType::FULL_TRANSCRIPTION:
                    $docInfo = $witnessInfo->typeSpecificInfo['docInfo'];
                    try {
                        $docLangCode = $this->systemManager->getLangCodeFromId($docInfo->language);
                    } catch (EntityDoesNotExistException $e) {
                        // should never happen
                        throw new RuntimeException($e->getMessage(), $e->getCode());
                    }
//                    $this->logger->debug("Doc lang code from witness $docLangCode");
                    if (!isset($languageInfoArray[$docLangCode])) {
                        $languageInfoArray[$docLangCode] = $this->getLanguagesByCode()[$docLangCode];
                        $languageInfoArray[$docLangCode]['totalWitnesses'] = 0;
                        $languageInfoArray[$docLangCode]['validWitnesses'] = 0;
                    }
                    $languageInfoArray[$docLangCode]['totalWitnesses']++;
                    if ($witnessInfo->isValid) {
                        $languageInfoArray[$docLangCode]['validWitnesses']++;
                    }
                    $lastVersion = $witnessInfo->typeSpecificInfo['lastVersion'];
                    /** @var $lastVersion ColumnVersionInfo */
//                    $authorsMentioned[] = $lastVersion->authorTid;
                        $pagesMentioned[] = $lastVersion->pageId;


                    $segmentArray =  $witnessInfo->typeSpecificInfo['segments'];
                    foreach ($segmentArray as $segment) {
                        /** @var $segment ApmChunkSegmentLocation */
                        $pagesMentioned[] = $segment->getStart()->pageId;
                        $pagesMentioned[] = $segment->getEnd()->pageId;
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

        $pagesMentioned = array_values(array_filter($pagesMentioned, function($page) { return $page !== 0;}));
        $pageInfoArray = array_map( function ($pageId) {
            return $this->systemManager->getDocumentManager()->getPageInfo($pageId);
        }, $pagesMentioned);

        $showAdminInfo = false;
        if ($this->systemManager->getUserManager()->isRoot($this->userId)) {
            $showAdminInfo = true;
        }

        $validChunks = $this->systemManager->getTranscriptionManager()->getChunksWithTranscriptionForWorkId($workId);
        $tablesInfo = $this->systemManager->getCollationTableManager()->getTablesInfo(false, $workId);
        foreach ($tablesInfo as $tableInfo) {
            if (!in_array($tableInfo['chunkNumber'], $validChunks)) {
                $validChunks[] = $tableInfo['chunkNumber'];
            }
        }
        sort($validChunks, SORT_NUMERIC);

        return $this->renderStandardPage(
            $response,
            '',
            "Chunk $workId-$chunkNumber",
            'ChunkPage',
            'js/pages/ChunkPage.js',
            [
                'workId' => $workId,
                'chunkNumber' => intval($chunkNumber),
                'witnessInfo' => $witnessInfoArrayForPage,
                'pageInfo' => $pageInfoArray,
                'languageInfo' => $fullLanguageInfo,
                'workInfo' => $workInfo,
                'validChunks' => $validChunks,
                'savedCollationTables' => $savedCollationTableInfoArray,
                'showAdminInfo' => $showAdminInfo,
            ],
            [],
            ['witness.css', 'act-settingsform.css', 'chunkpage.css']
        );
    }


   
}
