<?php
/*
 * Copyright (C) 2016 Universität zu Köln
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
use AverroesProject\Profiler\Profiler;

/**
 * Site Controller class
 *
 */
class SiteController
{
    protected $ci;
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->hm = $ci->hm;
       $config = $this->ci->settings;
       $this->ci->copyrightNotice  = $config['app_name'] . " v" . 
               $config['version'] . " &bull; &copy; " . 
               $config['copyright_notice'] . " &bull; " .  
               strftime("%d %b %Y, %H:%M:%S %Z");
    }
   
    public function homePage(Request $request, Response $response, $next)
    {
        return $response->withHeader('Location', 
                $this->ci->router->pathFor('dashboard'));
    }
   
    public function userProfilePage(Request $request, Response $response, $next)
    {
        
        $profileUsername = $request->getAttribute('username');
        $profiler = new Profiler('userProfilePage-' . $profileUsername, $this->db);
        if (!$this->db->um->userExistsByUsername($profileUsername)) {
            return $this->ci->view->render($response, 'user.notfound.twig', [
                        'userinfo' => $this->ci->userInfo,
                        'copyright' => $this->ci->copyrightNotice,
                        'baseurl' => $this->ci->settings['baseurl'],
                        'theuser' => $profileUsername
            ]);
        }

        $userProfileInfo = 
                $this->db->um->getUserInfoByUsername($profileUsername);
        $currentUserId = $this->ci->userInfo['id'];

        $canEditProfile = $userProfileInfo['id'] === $currentUserId ||
                $this->db->um->isUserAllowedTo($currentUserId, 'manageUsers');
        $canMakeRoot = 
                $this->db->um->isUserAllowedTo($currentUserId, 'makeRoot');
        $userProfileInfo['isroot'] = 
                $this->db->um->isRoot($userProfileInfo['id']);

        $profiler->lap("Basic Info");
        $userId = $userProfileInfo['id'];
        $docIds = $this->db->getDocIdsTranscribedByUser($userId);
        
        $docListHtml = '';
        foreach($docIds as $docId) {
            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'user.profile.twig', [
                    'userinfo' => $this->ci->userInfo,
                    'copyright' => $this->ci->copyrightNotice,
                    'baseurl' => $this->ci->settings['baseurl'],
                    'theuser' => $userProfileInfo,
                    'canEditProfile' => $canEditProfile,
                    'canMakeRoot' => $canMakeRoot,
                    'doclist' => $docListHtml
        ]);
    }

    public function userManagerPage(Request $request, Response $response, 
            $next)
    {
        $profiler = new Profiler('userManagerPage', $this->db);
        $um = $this->db->um;
        if (!$um->isUserAllowedTo($this->ci->userInfo['id'], 'manageUsers')){
            return $this->ci->view->render($response, 
                    'error.notallowed.tomanage.twig');
        }
        
        $db = $this->db;
        $docIds = $db->getDocIdList('title');
        $users = $um->getUserInfoForAllUsers();
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'user.manager.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'users' => $users
        ]);
    }
    
    public function userSettingsPage(Request $request, Response $response, 
            $next)
    {
        $username = $request->getAttribute('username');
        $curUserName = $this->ci->userInfo['username'];
        $userId = $this->ci->userInfo['id'];
        if ($username !== $curUserName && 
                !$this->db->um->isUserAllowedTo($userId, 'edit-user-settings')){
            return $this->ci->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'theuser' => $username
            ]);
        }
        
        if (!$this->db->um->userExistsByUsername($username)){
        return $this->ci->view->render($response, 'user.notfound.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $username
        ]);
        }
        $userInfo = $this->db->um->getUserInfoByUsername($username);
    
        return $this->ci->view->render($response, 'user.settings.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'canedit' => true,
            'theuser' => $userInfo
        ]);
    }
    
    public function documentsPage(Request $request, Response $response, $next)
    {
        $profiler = new Profiler('documentsPage', $this->db);
        $db = $this->db;
        $docIds = $db->getDocIdList('title');
        $profiler->lap('Doc Id List');
        $docs = array();
        foreach ($docIds as $docId){
            $profiler->lap("Doc $docId - START");
            $doc = array();
            $doc['numPages'] = $db->getPageCountByDocId($docId);
            $profiler->lap("Doc $docId - getPageCount");
            $transcribedPages = $db->getTranscribedPageListByDocId($docId);
            $profiler->lap("Doc $docId - getTranscribedPageList");
            $doc['numTranscribedPages'] = count($transcribedPages);
            $editorsIds = $db->getEditorsByDocId($docId);
            $profiler->lap("Doc $docId - getEditors");
            $doc['editors'] = [];
            foreach ($editorsIds as $edId){
                $doc['editors'][] = 
                        $this->db->um->getUserInfoByUserId($edId);
            }
            $doc['docInfo'] = $db->getDocById($docId);
            $doc['tableId'] = "doc-$docId-table";
            array_push($docs, $doc);
            $profiler->lap("Doc $docId - END");
        }
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'docs.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'docs' => $docs
        ]);
    }
    
     public function dashboardPage(Request $request, Response $response, $next)
    {
        
        $db = $this->db;
        $userId = (int)$this->ci->userInfo['id'];
        $profiler = new Profiler('dashboardPage-' . $this->ci->userInfo['username'] . '-' . $userId, $db);
        $docIds = $db->getDocIdsTranscribedByUser($userId);
        
        $docListHtml = '';
        foreach($docIds as $docId) {
            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'dashboard.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'doclist' => $docListHtml
        ]);
    }
    
    private function genDocPagesListForUser($userId, $docId)
    {
        $docInfo = $this->db->getDocById($docId);
        $url = $this->ci->router->pathFor('doc.showdoc', ['id' => $docId]);
        $title = $docInfo['title'];
        $docListHtml = '<li>';
        $docListHtml .= "<a href=\"$url\" title=\"View Document\">$title</a>";
        $docListHtml .= '<br/><span style="font-size: 0.9em">';
        $pageIds = $this->db->getPageIdsTranscribedByUser($userId, $docId);

        $nPagesInLine = 0;
        $maxPagesInLine = 25;
        foreach($pageIds as $pageId) {
            $nPagesInLine++;
            if ($nPagesInLine > $maxPagesInLine) {
                $docListHtml .= "<br/>";
                $nPagesInLine = 1;
            }
            $pageInfo = $this->db->getPageInfo($pageId);
            $pageNum = is_null($pageInfo['foliation']) ? $pageInfo['seq'] : $pageInfo['foliation'];
            $pageUrl = $this->ci->router->pathFor('pageviewer.docseq', ['doc' => $docId, 'seq'=>$pageInfo['seq']]);
            $docListHtml .= "<a href=\"$pageUrl\" title=\"View Page\">$pageNum</a>&nbsp;&nbsp;";
        }
        $docListHtml .= '</span></li>';
        
        return $docListHtml;
    }
    
    
    public function showDocPage(Request $request, Response $response, $next)
    {
        $profiler = new Profiler('showDocPage', $this->db);
        $docId = $request->getAttribute('id');
        $db = $this->db;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $doc['numLines'] = $db->getLineCountByDoc($docId);
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
    
    public function editDocPage(Request $request, Response $response, $next)
    {
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
        
        $languages = [ ['ar', 'Arabic'], ['he', 'Hebrew'], ['la', 'Latin']];
        $langOptions = '';
        foreach($languages as $lang) {
            $langOptions .= '<option value="' . $lang[0] . '"';
            if ($docInfo['lang'] === $lang[0]) {
                $langOptions  .= ' selected';
            }
            $langOptions .= '>' . $lang[1] . '</option>';
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
        
        return $this->ci->view->render($response, 'doc.edit.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'docInfo' => $docInfo, 
            'imageSourceOptions' => $imageSourceOptions,
            'langOptions' => $langOptions,
            'docTypesOptions' => $docTypesOptions
        ]);
        
    }
    
    public function defineDocPages(Request $request, Response $response, $next)
    {
        $profiler = new Profiler('defineDocPages', $this->db);
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
        $pageTypeNames  = $this->db->getPageTypeNames();
        $pageNumberFoliation = $pageNumber;
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
            'thePages' => $thePages,
            'imageUrl' => $imageUrl
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
        $pageTypeNames  = $this->db->getPageTypeNames();
        $pageNumberFoliation = $pageNumber;
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
            'thePages' => $thePages,
            'imageUrl' => $imageUrl
        ]);
    }
    
    // Utility function
    function buildPageArray($pagesInfo, $transcribedPages, $navByPage = true){
        $thePages = array();
        foreach ($pagesInfo as $page) {
            $thePage = array();
            $thePage['number'] = $page['page_number'];
            $thePage['seq'] = $page['seq'];
            $thePage['type'] = $page['type'];
            if ($page['foliation'] === NULL) {
                $thePage['foliation'] = '-';
            } else {
                $thePage['foliation'] = $page['foliation'];
            }
            
            $thePage['classes'] = '';
            if (array_search($page['page_number'], $transcribedPages) === FALSE){
                $thePage['classes'] = 
                        $thePage['classes'] . ' withouttranscription';
            }
            $thePage['classes'] .= ' type' . $page['type'];
            array_push($thePages, $thePage);
        }
        return $thePages;
    }
}
