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


namespace AverroesProject;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

/**
 * Site Controller class
 *
 */
class SiteController {
    protected $ci;
   //Constructor
   public function __construct( $ci) {
       $this->ci = $ci;
       $this->db = $ci->db;
       $config = $this->ci->settings;
       $this->ci->copyrightNotice  = $config['app_name'] . " v" . 
               $config['version'] . " &bull; &copy; " . 
               $config['copyright_notice'] . " &bull; " .  
               strftime("%d %b %Y, %H:%M:%S %Z");
   }
   
   public function homePage(Request $request, Response $response, $next){
        return $response->withHeader('Location', 
                $this->ci->router->pathFor('docs'));
   }
   
   
   public function userProfilePage(Request $request, Response $response, $next){

        $username = $request->getAttribute('username');
        if (!$this->ci->um->userExistsByUsername($username)){
        return $this->ci->view->render($response, 'user.notfound.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $username
        ]);
        }
        $userInfo = $this->ci->um->getUserInfoByUsername($username);
    
        return $this->ci->view->render($response, 'user.profile.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $userInfo
        ]);
    }
    
    public function userManagerPage(Request $request, Response $response, $next){
         $um = $this->ci->um;
        if (!$um->isUserAllowedTo($this->ci->userInfo['id'], 'manageUsers')){
            return $this->ci->view->render($response, 'error.notallowed.tomanage.twig');
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
    
    public function userSettingsPage(Request $request, Response $response, $next){

        $username = $request->getAttribute('username');
        $curUserName = $this->ci->userInfo['username'];
        $userId = $this->ci->userInfo['id'];
        if ($username !== $curUserName && !$this->ci->um->isUserAllowedTo($userId, 'edit-user-settings')){
            return $this->ci->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'theuser' => $username
            ]);
        }
        
        if (!$this->ci->um->userExistsByUsername($username)){
        return $this->ci->view->render($response, 'user.notfound.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $username
        ]);
        }
        $userInfo = $this->ci->um->getUserInfoByUsername($username);
        
        
    
        return $this->ci->view->render($response, 'user.settings.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'canedit' => true,
            'theuser' => $userInfo
        ]);
    }
    
    public function documentsPage(Request $request, Response $response, $next){
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
                array_push($doc['editors'], $this->ci->um->getUserInfoByUsername($edUsername));
            }
            $doc['docInfo'] = $db->getDoc($docId);
            $doc['tableId'] = "doc-$docId-table";
            $doc['pages'] = $this->buildPageArray($doc['numPages'], $transcribedPages);
            array_push($docs, $doc);
        }
        return $this->ci->view->render($response, 'docs.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'docs' => $docs
        ]);
    }
    
    function pageViewerPage(Request $request, Response $response, $next){
        $docId = $request->getAttribute('doc');
        $pageNumber = $request->getAttribute('page');

        $docInfo = $this->db->getDoc($docId);
        $docPageCount = $this->db->getPageCountByDocId($docId);
        $transcribedPages = $this->db->getPageListByDocId($docId);
        $thePages = $this->buildPageArray($docPageCount, $transcribedPages);
        $imageUrl = $this->db->getImageUrlByDocId($docId, $pageNumber);

        return $this->ci->view->render($response, 'pageviewer.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'doc' => $docId,
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl
        ]);
    }
    
    
    public static function errorPage(Request $request, Response $response, \Exception $exception){
        return $response->withStatus(500)
                ->withHeader('Content-Type', 'text/html')
                ->write('<h1>Oops, something went wrong!</h1>')
                ->write('<p>' . $exception->getMessage() . '</p>');
    }
    
    // Utility function
    function buildPageArray($numPages, $transcribedPages){
        $thePages = array();
        for ($pageNumber = 1; $pageNumber <= $numPages; $pageNumber++){
            $thePage = array();
            $thePage['number'] = $pageNumber;
            $thePage['classes'] = '';
            if (array_search($pageNumber, $transcribedPages) === FALSE){
                $thePage['classes'] = $thePage['classes'] . ' withouttranscription';
            }
            array_push($thePages, $thePage);
        }
        return $thePages;
    }
}
