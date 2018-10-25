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
use AverroesProject\Profiler\ApmProfiler;

/**
 * Site Controller class
 *
 */
class SiteDocuments extends SiteController
{

    public function documentsPage(Request $request, Response $response, $next)
    {
        $profiler = new ApmProfiler('documentsPage', $this->db);
        $db = $this->db;
        $docIds = $db->getDocIdList('title');
        $profiler->lap('Doc Id List');
        $docs = array();
        foreach ($docIds as $docId){
            //$profiler->lap("Doc $docId - START");
            $doc = array();
            $doc['numPages'] = $db->getPageCountByDocId($docId);
            //$profiler->lap("Doc $docId - getPageCount");
            $transcribedPages = $db->getTranscribedPageListByDocId($docId);
            //$profiler->lap("Doc $docId - getTranscribedPageList");
            $doc['numTranscribedPages'] = count($transcribedPages);
            $editorsIds = $db->getEditorsByDocId($docId);
            //$profiler->lap("Doc $docId - getEditors");
            $doc['editors'] = [];
            foreach ($editorsIds as $edId){
                $doc['editors'][] = 
                        $this->db->um->getUserInfoByUserId($edId);
            }
            $doc['docInfo'] = $db->getDocById($docId);
            $doc['tableId'] = "doc-$docId-table";
            array_push($docs, $doc);
            //$profiler->lap("Doc $docId - END");
        }
        
        $canManageDocuments = false;
        if ($this->db->um->isUserAllowedTo($this->ci->userInfo['id'], 'docs-create-new')) {
            $canManageDocuments = true;
        }
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'docs.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'docs' => $docs,
            'canManageDocuments' => $canManageDocuments
        ]);
    }
    
    public function showDocPage(Request $request, Response $response, $next)
    {
        
        $docId = $request->getAttribute('id');
        $profiler = new ApmProfiler('showDocPage-' . $docId, $this->db);
        $db = $this->db;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $transcribedPages = $db->getTranscribedPageListByDocId($docId);
        $pagesInfo = $db->getDocPageInfo($docId, \AverroesProject\Data\DataManager::ORDER_BY_SEQ);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $editorsIds = $db->getEditorsByDocId($docId);
        $doc['editors'] = array();
        foreach ($editorsIds as $edId){
            array_push($doc['editors'], 
                    $this->db->um->getUserInfoByUserId($edId));
        }
        $doc['docInfo'] = $db->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArray($pagesInfo, 
                $transcribedPages);
        
        $docInfoHtml = $this->hm->callHookedMethods('get-docinfo-html-' . $doc['docInfo']['image_source'],
                [ 'imageSourceData' => $doc['docInfo']['image_source_data']]);

        if (!is_string($docInfoHtml)) {
            $docInfoHtml = 'Image source not supported, please report to administrator.';
        }
        $doc['docInfoHtml'] = $docInfoHtml;
        
        $canDefinePages = false;
        if ($this->db->um->isUserAllowedTo($this->ci->userInfo['id'], 'define-doc-pages')) {
            $canDefinePages = true;
        }
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'doc.showdoc.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'navByPage' => false,
            'canDefinePages' => $canDefinePages,
            'doc' => $doc
        ]);
    }
    
    public function newDocPage(Request $request, Response $response, $next)
    {
     
        if (!$this->db->um->isUserAllowedTo($this->ci->userInfo['id'], 'create-new-documents')){
            $this->ci->logger->debug("User " . $this->ci->userInfo['id'] . ' tried to add new doc but is not allowed to do it');
            return $this->ci->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'message' => 'You are not authorized to add new documents in the system'
            ]);
        }
        
        $db = $this->db;
        $availableImageSources = $this->ci->hm->callHookedMethods('get-image-sources', []);
        $imageSourceOptions = '';
        $docImageSourceIsImplemented = false;
        foreach($availableImageSources as $imageSource) {
            $imageSourceOptions .= '<option value="' . $imageSource . '"';
            $imageSourceOptions .= '>' . $imageSource . '</option>';
        }
        
        
        $languages = $this->ci->settings['languages'];
        $langOptions = '';
        foreach($languages as $lang) {
            $langOptions .= '<option value="' . $lang['code'] . '"';
            $langOptions .= '>' . $lang['name'] . '</option>';
        }
        
        $docTypes = [ ['mss', 'Manuscript'], ['print', 'Print']];
        $docTypesOptions = '';
        foreach($docTypes as $type) {
            $docTypesOptions .= '<option value="' . $type[0] . '"';
            $docTypesOptions .= '>' . $type[1] . '</option>';
        }
        
        return $this->ci->view->render($response, 'doc.new.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'imageSourceOptions' => $imageSourceOptions,
            'langOptions' => $langOptions,
            'docTypesOptions' => $docTypesOptions
        ]);
    }
    
    public function editDocPage(Request $request, Response $response, $next)
    {
        if (!$this->db->um->isUserAllowedTo($this->ci->userInfo['id'], 'edit-documents')){
            $this->ci->logger->debug("User " . $this->ci->userInfo['id'] . ' tried to edit a document but is not allowed to do it');
            return $this->ci->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'message' => 'You are not authorized to edit document settings'
            ]);
        }
        
        $docId = $request->getAttribute('id');
        $db = $this->db;
        $docInfo = $db->getDocById($docId);
        
        $availableImageSources = $this->ci->hm->callHookedMethods('get-image-sources', []);
        
        $imageSourceOptions = '';
        $docImageSourceIsImplemented = false;
        foreach($availableImageSources as $imageSource) {
            $imageSourceOptions .= '<option value="' . $imageSource . '"';
            if ($docInfo['image_source'] === $imageSource) {
                $imageSourceOptions .= ' selected';
                $docImageSourceIsImplemented = true;
            }
            $imageSourceOptions .= '>' . $imageSource . '</option>';
        }
        
        
        $languages = $this->ci->settings['languages'];
        $langOptions = '';
        foreach($languages as $lang) {
            $langOptions .= '<option value="' . $lang['code'] . '"';
            if ($docInfo['lang'] === $lang['code']) {
                $langOptions  .= ' selected';
            }
            $langOptions .= '>' . $lang['name'] . '</option>';
        }
        
        $docTypes = [ ['mss', 'Manuscript'], ['print', 'Print']];
        $docTypesOptions = '';
        foreach($docTypes as $type) {
            $docTypesOptions .= '<option value="' . $type[0] . '"';
            if ($docInfo['doc_type'] === $type[0]) {
                $docTypesOptions  .= ' selected';
            }
            $docTypesOptions .= '>' . $type[1] . '</option>';
        }
        
        $canBeDeleted = false;
        $nPages = $db->getPageCountByDocIdAllTime($docId);
        $this->ci->logger->debug("nPages all time: " . $nPages);
        if ($nPages === 0) {
            $canBeDeleted = true;
        }
        
        return $this->ci->view->render($response, 'doc.edit.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'docInfo' => $docInfo, 
            'imageSourceOptions' => $imageSourceOptions,
            'langOptions' => $langOptions,
            'docTypesOptions' => $docTypesOptions,
            'canBeDeleted' => $canBeDeleted
        ]);
        
        
    }
    
    public function defineDocPages(Request $request, Response $response, $next)
    {
        $profiler = new ApmProfiler('defineDocPages', $this->db);
        
        if (!$this->db->um->isUserAllowedTo($this->ci->userInfo['id'], 'define-doc-pages')){
            $this->ci->logger->debug("User " . $this->ci->userInfo['id'] . ' tried to define document pages  but is not allowed to do it');
            return $this->ci->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'message' => 'You are not authorized to edit document settings'
            ]);
        }
        
        $docId = $request->getAttribute('id');
        $db = $this->db;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $transcribedPages = $db->getTranscribedPageListByDocId($docId);
        $pagesInfo = $db->getDocPageInfo($docId);
        $pageTypes  = $this->db->getPageTypeNames();
        $doc['numTranscribedPages'] = count($transcribedPages);
        $doc['docInfo'] = $db->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArray($pagesInfo, 
                $transcribedPages);

        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'doc.defdocpages.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'pageTypes' => $pageTypes,
            'doc' => $doc
        ]);
    }
}
