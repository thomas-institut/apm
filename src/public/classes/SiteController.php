<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';


/**
 * Description of SiteController
 *
 * @author rafael
 */
class SiteController {
    protected $ci;
   //Constructor
   public function __construct( $ci) {
       $this->ci = $ci;
       $this->db = $ci->db;
       $config = $this->ci->settings;
       $this->ci->copyrightNotice  = $config['app_name'] . " " . $config['version'] . " &bull; &copy; " . $config['copyright_notice'] . " &bull; " .  strftime("%d %b %Y, %H:%M:%S %Z");
   }
   
   public function homePage(Request $request, Response $response, $next){
        return $response->withHeader('Location', $this->ci->router->pathFor('docs'));
   }
   
   
   public function userProfilePage(Request $request, Response $response, $next){

        $username = $request->getAttribute('username');
        if (!$this->db->usernameExists($username)){
        return $this->ci->view->render($response, 'user.notfound.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $username
        ]);
        }
        $userInfo = $this->db->getUserInfoByUsername($username);
    
        return $this->ci->view->render($response, 'user.profile.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $userInfo
        ]);
    }
    
    public function documentsPage(Request $request, Response $response, $next){
        $db = $this->db;
        $docIds = $db->getDocIdList();
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
                array_push($doc['editors'], $db->getUserInfoByUsername($edUsername));
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
