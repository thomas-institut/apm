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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use APM\System\SystemManager;
use APM\System\Work\WorkNotFoundException;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;


/**
 * Site Controller class
 *
 */
class SiteWorks extends SiteController
{

    const WORK_DATA_CACHE_KEY = 'SiteWorks-WorkData';
    const WORK_DATA_TTL = 8 * 24 * 3600;
    const TEMPLATE_WORKS_PAGE = 'works-page.twig';
    const TEMPLATE_WORK_PAGE = 'work-page.twig';


    public function workPage(Request $request, Response $response): Response {

        $id = $request->getAttribute('id');

        $workManager = $this->systemManager->getWorkManager();

        try {
            $workData = $workManager->getWorkDataByDareId($id);
            return $this->renderPage($response, self::TEMPLATE_WORK_PAGE, [
                'workData' => $workData
            ]);
        } catch ( WorkNotFoundException) {
            try {
                $tid = Tid::fromString($id);
                if ($tid === -1) {
                    return $this->getErrorPage($response, 'Error', "Invalid work id", HttpStatus::BAD_REQUEST);
                }
                $workData = $workManager->getWorkData($tid);
                return $this->renderPage($response, self::TEMPLATE_WORK_PAGE, [
                    'workData' => $workData
                ]);
            } catch (WorkNotFoundException) {
                return $this->getErrorPage($response, 'Error', "Work $id not found", HttpStatus::NOT_FOUND);
            }
        }
    }
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function worksPage(Request $request, Response $response): Response
    {
        
        $cache = $this->systemManager->getSystemDataCache();
        try {
            $works = unserialize($cache->get(self::WORK_DATA_CACHE_KEY));
        } catch (KeyNotInCacheException) {
            // not in cache
            $works = self::buildWorkData($this->systemManager, $this->logger);
            $cache->set(self::WORK_DATA_CACHE_KEY, serialize($works), self::WORK_DATA_TTL);
        }
        return $this->renderPage($response, self::TEMPLATE_WORKS_PAGE, [
            'works' => $works
        ]);
    }

    private static function getWorkDataBasicInfo(string $workId, SystemManager $systemManager) : array {
        $workDataBasicInfo = [
            'workId' => $workId,
            'isValid' => true,
        ];
        try {
            $workData = $systemManager->getWorkManager()->getWorkDataByDareId($workId);
            $workDataBasicInfo['entityId'] = $workData->entityId;
            $workDataBasicInfo['authorId'] = $workData->authorId;
            $workDataBasicInfo['title'] = $workData->title;
            $workDataBasicInfo['shortTitle'] = $workData->shortTitle;
            $workDataBasicInfo['chunks'] = [];
        } catch (WorkNotFoundException) {
            $workDataBasicInfo['isValid'] = false;
        }
        return $workDataBasicInfo;
    }

    private static function getChunkBasicArray(int $chunkNumber) : array {
        return
            [
                'n' => $chunkNumber,
                'tx' => false,
                'ed' => false,
                'ct' => false
            ];
    }


    /**
     * Generates an array with active works in the system for use in the site's "Works" page.
     *
     * The returned array has one entry per active work in the system with the workId as the
     * array key
     * ```
     *  $resultsArray['WWW'] = [
     *   'workId' => 'WWW', // a.k.a. Dare id
     *   'isValid' => bool // if false, there's some inconsistency in the database and the other fields are undefined
     *   'entityId' => int
     *   'authorId' => int // entity id
     *   'title' => string
     *   'shortTitle' => string
     *   'chunks' => array
     * ]
     * ```
     * The ``chunks`` array has one entry per chunk with some data in the system with the
     * chunk number as array key:
     *
     * ```
     *   chunks[N] = [
     *      'n' => N,
     *      'tx' => bool, // hasTranscriptions
     *      'ed' => bool, // hasEditions
     *      'ct' => bool // hasCollationTables
     *   ]
     * ```
     *
     *
     * @param SystemManager $systemManager
     * @param LoggerInterface|null $logger
     * @return array
     */
    public static function buildWorkData(SystemManager $systemManager, ?LoggerInterface $logger = null) : array {
        $debug = true;
        if ($logger === null) {
            $logger = new NullLogger();
        }
        $works = [];
        $tableInfoArray = $systemManager->getCollationTableManager()->getTablesInfo();
        $debug && $logger->debug('Got ' . count($tableInfoArray) . ' active tables');
        foreach ($tableInfoArray as $table) {
            $workId = $table['workId'];
            if (!isset($works[$workId])) {
                $works[$workId] = self::getWorkDataBasicInfo($workId, $systemManager);
                if (!$works[$workId]['isValid']) {
                    $logger->error("BuildWorkData: found an invalid work while processing active collation tables", [
                        'work' => $works[$workId],
                        'table' => $table
                    ]);
                }
            }
            if ($works[$workId]['isValid']) {
                $chunkNumber = $table['chunkNumber'];
                if (!isset($works[$workId]['chunks'][$chunkNumber])) {
                    $works[$workId]['chunks'][$chunkNumber] = self::getChunkBasicArray($chunkNumber);
                }
                if ($table['type'] === 'edition') {
                    $works[$workId]['chunks'][$chunkNumber]['ed'] = true;
                } else {
                    $works[$workId]['chunks'][$chunkNumber]['ct'] = true;
                }
            }
        }
        $worksWithTranscriptions = $systemManager->getTranscriptionManager()->getWorksWithTranscription();
        $debug && $logger->debug('Got ' . count($worksWithTranscriptions) . ' works with transcriptions');
        foreach($worksWithTranscriptions as $workId) {
            if (!isset($works[$workId])) {
                $works[$workId] = self::getWorkDataBasicInfo($workId, $systemManager);
                if (!$works[$workId]['isValid']) {
                    $logger->error("BuildWorkData: Found an invalid work while processing works with transcriptions",
                        [ 'data' => $works[$workId] ]);
                }
            }
            if ($works[$workId]['isValid']) {
                $chunksWithTranscriptions = $systemManager->getTranscriptionManager()->getChunksWithTranscriptionForWorkId($workId);
                foreach($chunksWithTranscriptions as $chunkNumber) {
                    if ($chunkNumber >= 1) {
                        if (!isset($works[$workId]['chunks'][$chunkNumber])) {
                            $works[$workId]['chunks'][$chunkNumber] = self::getChunkBasicArray($chunkNumber);
                        }
                        $works[$workId]['chunks'][$chunkNumber]['tx'] = true;
                    }
                }
            }
        }
        $debug && $logger->debug('Finished building work data, there are ' . count($works) . ' active works');
        return $works;
    }

    public static function updateCachedWorkData(SystemManager $systemManager): bool
    {
        try {
            $works = self::buildWorkData($systemManager, $systemManager->getLogger());
            $systemManager->getSystemDataCache()->set(self::WORK_DATA_CACHE_KEY, serialize($works), self::WORK_DATA_TTL);
        } catch(Exception $e) {
            $systemManager->getLogger()->error("Exception while updating cached WorkData",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        return true;
    }


//    private function prettyPrintFullTxMap(array $fullTxMap) : string {
//        $html = '';
//        $mapDump = print_r($fullTxMap, true);
//
//        foreach($fullTxMap as $workId => $chunkArray) {
//            $html .= '<h2>' . $workId . '</h2>';
//            foreach($chunkArray as $chunkNumber => $docArray) {
//                $html .= "$workId-$chunkNumber";
//                $html .= '<ul>';
//                foreach($docArray as $docId => $lwidArray) {
//                    foreach($lwidArray as $lwid => $segmentArray) {
//                        $html .= "<li>$docId-$lwid : " . count($segmentArray) . " segment(s)</li>";
//                    }
//                }
//                $html .= '</ul>';
//            }
//        }
//        return $html;
//    }


    
   
}
