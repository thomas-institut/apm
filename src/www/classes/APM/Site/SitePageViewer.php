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

use AverroesProject\Data\DataManager;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

/**
 * Site Controller class
 *
 */
class SitePageViewer extends SiteController
{

    const TEMPLATE_TRANSCRIPTION_EDITOR = 'transcription-editor.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    function pageViewerPageByDocPage(Request $request, Response $response)
    {
        $docId = $request->getAttribute('doc');
        $pageNumber = $request->getAttribute('page');
        $activeColumn = intval($request->getAttribute('col'));
        if ($activeColumn === 0) {
            $activeColumn = 1;
        }
        $docInfo = $this->dataManager->getDocById($docId);
        $pageInfo = $this->dataManager->getPageInfoByDocPage($docId, $pageNumber);

        $docPageCount = $this->dataManager->getPageCountByDocId($docId);
        $pagesInfo = $this->dataManager->getDocPageInfo($docId, DataManager::ORDER_BY_PAGE_NUMBER);
        $transcribedPages = $this->dataManager->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->dataManager->getImageUrl($docId, $pageInfo['img_number']);
//        $osdConfig = $this->dataManager->getOpenSeaDragonConfig($docId, $pageInfo['img_number']);
        $pageTypeNames  = $this->dataManager->getPageTypeNames();
        $activeWorks = $this->dataManager->getActiveWorks();
        $pageNumberFoliation = $pageNumber;
        $languagesArray = $this->languages;
        $deepZoom = $this->dataManager->isImageDeepZoom($docId) ? '1' : '0';

        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->renderPage($response, self::TEMPLATE_TRANSCRIPTION_EDITOR, [
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
    function pageViewerPageByDocSeq(Request $request, Response $response)
    {
        $docId = $request->getAttribute('doc');
        $seq = $request->getAttribute('seq');
        $activeColumn = intval($request->getAttribute('col'));
        if ($activeColumn === 0) {
            $activeColumn = 1;
        }
        
        $docInfo = $this->dataManager->getDocById($docId);
        $pageId = $this->dataManager->getPageIdByDocSeq($docId, $seq);
        $pageInfo = $this->dataManager->getPageInfo($pageId);
        $pageNumber = $pageInfo['page_number'];
        $docPageCount = $this->dataManager->getPageCountByDocId($docId);
        $pagesInfo = $this->dataManager->getDocPageInfo($docId, DataManager::ORDER_BY_SEQ);
        $transcribedPages = $this->dataManager->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->dataManager->getImageUrl($docId, $pageInfo['img_number']);
//        $osdConfig = $this->dataManager->getOpenSeaDragonConfig($docId, $pageInfo['img_number']);
        $pageTypeNames  = $this->dataManager->getPageTypeNames();
        $activeWorks = $this->dataManager->getActiveWorks();
        $languagesArray = $this->languages;

        $pageNumberFoliation = $pageInfo['seq'];
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        $deepZoom = $this->dataManager->isImageDeepZoom($docId) ? '1' : '0';

        return $this->renderPage($response, self::TEMPLATE_TRANSCRIPTION_EDITOR, [
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
//            'openSeaDragonConfig' => $osdConfig,
            'languagesArray' => $languagesArray,
            'deepZoom' => $deepZoom
        ]);
    }

}
