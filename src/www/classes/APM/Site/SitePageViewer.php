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

use APM\System\Work\WorkNotFoundException;
use AverroesProject\Data\DataManager;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * Site Controller class
 *
 */
class SitePageViewer extends SiteController
{

    const PAGE_VIEWER_TWIG = 'page-viewer.twig';


    /**
     * Returns an array of active work data with the same format as the
     * legacy DataManager getActiveWorks
     *
     * @return string[]
     */
    private function getActiveWorks() : array {
       $enabledWorks = $this->systemManager->getWorkManager()->getEnabledWorks();
       $this->logger->debug("EnabledWorks: ".count($enabledWorks), [ $enabledWorks]);

       $activeWorks = [];
       foreach ($enabledWorks as $work) {
           try {
               $workData = $this->systemManager->getWorkManager()->getWorkData($work);
           } catch (WorkNotFoundException $e) {
               // should never happen
               throw new \RuntimeException($e->getMessage());
           }
           $activeWorks[] = [
               'title' => '(' . $workData->dareId . ') ' . $workData->shortTitle,
               'dareId' => $workData->dareId,
               'maxChunk' => 500
           ];
       }
       return $activeWorks;
    }


    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    function pageViewerPageByDocPage(Request $request, Response $response): Response
    {
        $docId = $request->getAttribute('doc');
        $pageNumber = $request->getAttribute('page');
        $activeColumn = intval($request->getAttribute('col'));
        if ($activeColumn === 0) {
            $activeColumn = 1;
        }
        $dataManager = $this->systemManager->getDataManager();
        $docInfo = $dataManager->getDocById($docId);
        $pageInfo = $dataManager->getPageInfoByDocPage($docId, $pageNumber);

        $docPageCount = $dataManager->getPageCountByDocId($docId);
        $pagesInfo = $dataManager->getDocPageInfo($docId);
        $transcribedPages = $dataManager->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $dataManager->getImageUrl($docId, $pageInfo['img_number']);
        $pageTypeNames  = $dataManager->getPageTypeNames();
//        $activeWorks = $dataManager->getActiveWorks();
        $activeWorks = $this->getActiveWorks();
        $pageNumberFoliation = $pageNumber;
        $languagesArray = $this->getLanguages();
        $deepZoom = $dataManager->isImageDeepZoom($docId) ? '1' : '0';

        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->renderPage($response, self::PAGE_VIEWER_TWIG, [
            'navByPage' => true,
            'doc' => $docId,
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'seq' => $pageInfo['seq'],
            'pageNumberFoliation' => $pageNumberFoliation,
            'pageInfo' => $pageInfo,
            'activeColumn' => $activeColumn,
            'pageTypeNames' => $pageTypeNames,
            'activeWorks' => $activeWorks,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl,
            'languagesArray' => $languagesArray,
            'deepZoom' => $deepZoom
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    function pageViewerPageByDocSeq(Request $request, Response $response): Response
    {
        $docId = $request->getAttribute('doc');
        $seq = $request->getAttribute('seq');
        $activeColumn = intval($request->getAttribute('col'));
        if ($activeColumn === 0) {
            $activeColumn = 1;
        }
        $dataManager = $this->systemManager->getDataManager();
        
        $docInfo = $dataManager->getDocById($docId);
        $pageId = $dataManager->getPageIdByDocSeq($docId, $seq);
        $pageInfo = $dataManager->getPageInfo($pageId);
        $pageNumber = $pageInfo['page_number'];
        $docPageCount = $dataManager->getPageCountByDocId($docId);
        $pagesInfo = $dataManager->getDocPageInfo($docId, DataManager::ORDER_BY_SEQ);
        $transcribedPages = $dataManager->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $dataManager->getImageUrl($docId, $pageInfo['img_number']);
        $pageTypeNames  = $dataManager->getPageTypeNames();
//        $activeWorks = $dataManager->getActiveWorks();
        $activeWorks = $this->getActiveWorks();
        $languagesArray = $this->getLanguages();

        $pageNumberFoliation = $pageInfo['seq'];
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        $deepZoom = $this->systemManager->getDataManager()->isImageDeepZoom($docId) ? '1' : '0';

        return $this->renderPage($response, self::PAGE_VIEWER_TWIG, [
            'navByPage' => false,  // i.e., navigate by sequence
            'doc' => $docId,
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'seq' => $seq,
            'activeColumn' => $activeColumn,
            'pageNumberFoliation' => $pageNumberFoliation,
            'pageInfo' => $pageInfo,
            'pageTypeNames' => $pageTypeNames,
            'activeWorks' => $activeWorks,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl,
            'languagesArray' => $languagesArray,
            'deepZoom' => $deepZoom
        ], true, false);
    }

}
