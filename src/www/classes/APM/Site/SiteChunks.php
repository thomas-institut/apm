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

use APM\FullTranscription\ApmChunkSegmentLocation;
use APM\System\SystemManager;
use AverroesProject\Data\DataManager;
use Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


use AverroesProject\ItemStream\ItemStream;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

/**
 * Site Controller class
 *
 */
class SiteChunks extends SiteController
{

    const WORK_DATA_CACHE_KEY = 'SiteChunks-WorkData';
    const TEMPLATE_WORKS_PAGE = 'works-page.twig';
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function worksPage(Request $request, Response $response): Response
    {
        $dataManager = $this->dataManager;
        $this->profiler->start();
        $cache = $this->systemManager->getSystemDataCache();
        $cacheHit = true;
        $this->systemManager->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $works = unserialize($cache->get(self::WORK_DATA_CACHE_KEY));
        } catch (KeyNotInCacheException $e) {
            // not in cache
            $cacheHit = false;
            $works = self::buildWorkData($dataManager);
            $cache->set(self::WORK_DATA_CACHE_KEY, serialize($works));
        }
        if ($cacheHit) {
            $this->systemManager->getCacheTracker()->incrementHits();
        } else {
            $this->systemManager->getCacheTracker()->incrementMisses();
        }

        $this->profiler->stop();
        $this->logProfilerData('chunksPage');
        return $this->renderPage($response, self::TEMPLATE_WORKS_PAGE, [
            'works' => $works
        ]);
    }

    public static function buildWorkData(DataManager $dataManager) : array {

        $works = [];
        $workIds = $dataManager->getWorksWithTranscriptions();
        foreach($workIds as $workId) {
            $work = ['work_id' => $workId, 'is_valid' => true];
            $workInfo = $dataManager->getWorkInfoByDareId($workId);
            if ($workInfo === false) {
                $work['is_valid'] = false;
                $works[] = $work;
                continue;
            }
            $work['work_info'] = $workInfo;
            $chunks = $dataManager->getChunksWithTranscriptionForWorkId($workId);
            $work['chunks'] = $chunks;
            $works[] = $work;
        }
        return $works;
    }

    public static function updateDataCache(SystemManager $systemManager): bool
    {
        try {
            $works = self::buildWorkData( $systemManager->getDataManager());
        } catch(Exception $e) {
            $systemManager->getLogger()->error("Exception while building ChunkData",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        $systemManager->getSystemDataCache()->set(self::WORK_DATA_CACHE_KEY, serialize($works));
        return true;
    }

    public static function invalidateCache(DataCache $cache) {
        try {
            $cache->delete(self::WORK_DATA_CACHE_KEY);
        } catch (KeyNotInCacheException $e) {
            // no problem!!
        }
    }


    private function prettyPrintFullTxMap(array $fullTxMap) : string {
        $html = '';
        $mapDump = print_r($fullTxMap, true);

        foreach($fullTxMap as $workId => $chunkArray) {
            $html .= '<h2>' . $workId . '</h2>';
            foreach($chunkArray as $chunkNumber => $docArray) {
                $html .= "$workId-$chunkNumber";
                $html .= '<ul>';
                foreach($docArray as $docId => $lwidArray) {
                    foreach($lwidArray as $lwid => $segmentArray) {
                        $html .= "<li>$docId-$lwid : " . count($segmentArray) . " segment(s)</li>";
                    }
                }
                $html .= '</ul>';
            }
        }
        return $html;
    }


    
   
}
