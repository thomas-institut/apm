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


namespace AverroesProject\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

/**
 * Site Controller class
 *
 */
class SitePageViewer extends SiteController
{
    function pageViewerPageByDocPage(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('doc');
        $pageNumber = $request->getAttribute('page');

        $docInfo = $this->dataManager->getDocById($docId);
        $pageInfo = $this->dataManager->getPageInfoByDocPage($docId, $pageNumber);

        $docPageCount = $this->dataManager->getPageCountByDocId($docId);
        $pagesInfo = $this->dataManager->getDocPageInfo($docId, \AverroesProject\Data\DataManager::ORDER_BY_PAGE_NUMBER);
        $transcribedPages = $this->dataManager->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->dataManager->getImageUrl($docId, $pageInfo['img_number']);
        $osdConfig = $this->dataManager->getOpenSeaDragonConfig($docId, $pageInfo['img_number']);
        $pageTypeNames  = $this->dataManager->getPageTypeNames();
        $activeWorks = $this->dataManager->getActiveWorks();
        $pageNumberFoliation = $pageNumber;
        $languagesArray = $this->config['languages'];
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->view->render($response, 'pageviewer.twig', [
            'userinfo' => $this->userInfo,
            'copyright' => $this->copyrightNotice,
            'baseurl' => $this->config['baseurl'],
            'navByPage' => true,
            'doc' => $docId,
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'seq' => $pageInfo['seq'],
            'pageNumberFoliation' => $pageNumberFoliation,
            'pageInfo' => $pageInfo,
            'pageTypeNames' => $pageTypeNames,
            'activeWorks' => $activeWorks,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl,
            'openSeaDragonConfig' => $osdConfig,
            'languagesArray' => $languagesArray
        ]);
    }
    
     function pageViewerPageByDocSeq(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('doc');
        $seq = $request->getAttribute('seq');
        
        $docInfo = $this->dataManager->getDocById($docId);
        $pageId = $this->dataManager->getPageIdByDocSeq($docId, $seq);
        $pageInfo = $this->dataManager->getPageInfo($pageId);
        $pageNumber = $pageInfo['page_number'];
        $docPageCount = $this->dataManager->getPageCountByDocId($docId);
        $pagesInfo = $this->dataManager->getDocPageInfo($docId, \AverroesProject\Data\DataManager::ORDER_BY_SEQ);
        $transcribedPages = $this->dataManager->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->dataManager->getImageUrl($docId, $pageInfo['img_number']);
        $osdConfig = $this->dataManager->getOpenSeaDragonConfig($docId, $pageInfo['img_number']);
        $pageTypeNames  = $this->dataManager->getPageTypeNames();
        $activeWorks = $this->dataManager->getActiveWorks();
        $languagesArray = $this->config['languages'];
        
        $pageNumberFoliation = $pageInfo['seq'];
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->view->render($response, 'pageviewer.twig', [
            'userinfo' => $this->userInfo,
            'copyright' => $this->copyrightNotice,
            'baseurl' => $this->config['baseurl'],
            'navByPage' => false,  // i.e., navigate by sequence
            'doc' => $docId,
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'seq' => $seq,
            'pageNumberFoliation' => $pageNumberFoliation,
            'pageInfo' => $pageInfo,
            'pageTypeNames' => $pageTypeNames,
            'activeWorks' => $activeWorks,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl,
           'openSeaDragonConfig' => $osdConfig,
            'languagesArray' => $languagesArray
        ]);
    }

}
