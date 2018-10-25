<?php
/*
 * Copyright (C) 2016-18 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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

        $docInfo = $this->db->getDocById($docId);
        $pageInfo = $this->db->getPageInfoByDocPage($docId, $pageNumber);
        //$this->ci->logger->debug('Page info', $pageInfo);
        $docPageCount = $this->db->getPageCountByDocId($docId);
        $pagesInfo = $this->db->getDocPageInfo($docId, \AverroesProject\Data\DataManager::ORDER_BY_PAGE_NUMBER);
        $transcribedPages = $this->db->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->db->getImageUrl($docId, $pageInfo['img_number']);
        $osdConfig = $this->db->getOpenSeaDragonConfig($docId, $pageInfo['img_number']);
        $pageTypeNames  = $this->db->getPageTypeNames();
        $activeWorks = $this->db->getActiveWorks();
        $pageNumberFoliation = $pageNumber;
        $languagesArray = $this->ci->settings['languages'];
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->ci->view->render($response, 'pageviewer.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
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
        
        $docInfo = $this->db->getDocById($docId);
        $pageId = $this->db->getPageIdByDocSeq($docId, $seq);
        $pageInfo = $this->db->getPageInfo($pageId);
        $pageNumber = $pageInfo['page_number'];
        $docPageCount = $this->db->getPageCountByDocId($docId);
        $pagesInfo = $this->db->getDocPageInfo($docId, \AverroesProject\Data\DataManager::ORDER_BY_SEQ);
        $transcribedPages = $this->db->getTranscribedPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->db->getImageUrl($docId, $pageInfo['img_number']);
        $osdConfig = $this->db->getOpenSeaDragonConfig($docId, $pageInfo['img_number']);
        $pageTypeNames  = $this->db->getPageTypeNames();
        $activeWorks = $this->db->getActiveWorks();
        $languagesArray = $this->ci->settings['languages'];
        
        $pageNumberFoliation = $pageInfo['seq'];
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->ci->view->render($response, 'pageviewer.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
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
