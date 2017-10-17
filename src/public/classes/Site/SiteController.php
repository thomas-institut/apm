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
       $config = $this->ci->settings;
       $this->ci->copyrightNotice  = $config['app_name'] . " v" . 
               $config['version'] . " &bull; &copy; " . 
               $config['copyright_notice'] . " &bull; " .  
               strftime("%d %b %Y, %H:%M:%S %Z");
    }
   
    public function homePage(Request $request, Response $response, $next)
    {
        return $response->withHeader('Location', 
                $this->ci->router->pathFor('docs'));
    }
   
    public function userProfilePage(Request $request, Response $response, $next)
    {
        $profileUsername = $request->getAttribute('username');
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

        return $this->ci->view->render($response, 'user.profile.twig', [
                    'userinfo' => $this->ci->userInfo,
                    'copyright' => $this->ci->copyrightNotice,
                    'baseurl' => $this->ci->settings['baseurl'],
                    'theuser' => $userProfileInfo,
                    'canEditProfile' => $canEditProfile,
                    'canMakeRoot' => $canMakeRoot,
        ]);
    }

    public function userManagerPage(Request $request, Response $response, 
            $next)
    {
        $um = $this->db->um;
        if (!$um->isUserAllowedTo($this->ci->userInfo['id'], 'manageUsers')){
            return $this->ci->view->render($response, 
                    'error.notallowed.tomanage.twig');
        }
        
        $db = $this->db;
        $docIds = $db->getDocIdList('title');
        $users = $um->getUserInfoForAllUsers();
        
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
        $db = $this->db;
        $docIds = $db->getDocIdList('title');
        $docs = array();
        foreach ($docIds as $docId){
            $doc = array();
            $doc['numPages'] = $db->getPageCountByDocId($docId);
            $doc['numLines'] = $db->getLineCountByDoc($docId);
            $transcribedPages = $db->getPageListByDocId($docId);
            $doc['numTranscribedPages'] = count($transcribedPages);
            $editorsUsernames = $db->getEditorsByDocId($docId);
            $doc['editors'] = array();
            foreach ($editorsUsernames as $edUsername){
                array_push($doc['editors'], 
                        $this->db->um->getUserInfoByUsername($edUsername));
            }
            $doc['docInfo'] = $db->getDocById($docId);
            $doc['tableId'] = "doc-$docId-table";
            array_push($docs, $doc);
        }
        return $this->ci->view->render($response, 'docs.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'docs' => $docs
        ]);
    }
    
    public function showDocPage(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('id');
        $db = $this->db;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $doc['numLines'] = $db->getLineCountByDoc($docId);
        $transcribedPages = $db->getPageListByDocId($docId);
        $pagesInfo = $db->getDocPageInfo($docId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $editorsUsernames = $db->getEditorsByDocId($docId);
        $doc['editors'] = array();
        foreach ($editorsUsernames as $edUsername){
            array_push($doc['editors'], 
                    $this->db->um->getUserInfoByUsername($edUsername));
        }
        $doc['docInfo'] = $db->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArray($pagesInfo, 
                $transcribedPages);

        return $this->ci->view->render($response, 'doc.showdoc.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'doc' => $doc
        ]);
    }
    
    public function defineDocPages(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('id');
        $db = $this->db;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $transcribedPages = $db->getPageListByDocId($docId);
        $pagesInfo = $db->getDocPageInfo($docId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $doc['docInfo'] = $db->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArray($pagesInfo, 
                $transcribedPages);

        return $this->ci->view->render($response, 'doc.defdocpages.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'doc' => $doc
        ]);
    }
    
    function pageViewerPage(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('doc');
        $pageNumber = $request->getAttribute('page');

        $docInfo = $this->db->getDocById($docId);
        $pageInfo = $this->db->getPageInfoByDocPage($docId, $pageNumber);
        //$this->ci->logger->debug('Page info', $pageInfo);
        $docPageCount = $this->db->getPageCountByDocId($docId);
        $pagesInfo = $this->db->getDocPageInfo($docId);
        $transcribedPages = $this->db->getPageListByDocId($docId);
        $thePages = $this->buildPageArray($pagesInfo, $transcribedPages);
        $imageUrl = $this->db->getImageUrlByDocId($docId, $pageNumber);
        $pageTypeNames  = $this->db->getPageTypeNames();
        $pageNumberFoliation = $pageNumber;
        if ($pageInfo['foliation'] !== NULL) {
            $pageNumberFoliation = $pageInfo['foliation'];
        }

        return $this->ci->view->render($response, 'pageviewer.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'doc' => $docId,
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'pageNumberFoliation' => $pageNumberFoliation,
            'pageInfo' => $pageInfo,
            'pageTypeNames' => $pageTypeNames,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl
        ]);
    }
    
    // Utility function
    function buildPageArray($pagesInfo, $transcribedPages){
        $thePages = array();
        foreach ($pagesInfo as $page) {
            $thePage = array();
            $thePage['number'] = $page['page_number'];
            $thePage['type'] = $page['type'];
            if ($page['foliation'] === NULL) {
                $thePage['foliation'] = $page['page_number'];
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
