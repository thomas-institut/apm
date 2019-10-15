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

use APM\Plugin\HookManager;
use Monolog\Logger;
use \Psr\Http\Message\ResponseInterface as Response;

use APM\System\ApmSystemManager;
use AverroesProject\Data\DataManager;
use Slim\Container;
use Slim\Views\Twig;

/**
 * Site Controller class
 *
 */
class SiteController
{
    /**
     * @var Container
     */
    protected $ci;
    
    /** @var ApmSystemManager */
    protected $systemManager;
    
    /** @var Twig */
    protected $view;
    
    /** @var array */
    protected $config;
    
    /** @var DataManager */
    protected $dataManager;
    
    /** @var bool */
    protected $userAuthenticated;
    
    /** @var array */
    protected $userInfo;

    /**
     * @var HookManager
     */
    protected $hookManager;

    /**
     * @var Logger
     */
    protected $logger;
    
    //Constructor
    public function __construct($ci)
    {
        $this->ci = $ci;
        $this->systemManager = $ci->sm;
        $this->view = $ci->view;
        $this->config = $ci->config;
        $this->dataManager = $ci->db;
        $this->hookManager = $ci->hm;
        $this->logger = $this->systemManager->getLogger();
        $this->userAuthenticated = false;
        $this->userInfo = [];
       
       // Check if the user has been authenticated by the authentication middleware
        if (isset($ci->userInfo)) {
           $this->userAuthenticated = true;
           $this->userInfo = $ci->userInfo;
        }
    }
    
    protected function renderPage(Response $response, string $template, array $data, $withBaseData = true) {
        
        if ($withBaseData) {
            $data['copyright']  = $this->getCopyrightNotice();
            $data['baseurl'] = $this->getBaseUrl();
            $data['userAuthenticated'] = $this->userAuthenticated;
            if ($this->userAuthenticated) {
                $data['userinfo'] = $this->userInfo;
            }
        }
        
        return $this->view->render($response, $template, $data);
    }
    
    protected function getCopyrightNotice() : string {
        return $this->config['app_name'] . " v" . 
               $this->config['version'] . " &bull; &copy; " . 
               $this->config['copyright_notice'] . " &bull; " .  
               strftime("%d %b %Y, %H:%M:%S %Z");
    }
    
    protected function getBaseUrl() : string {
        return $this->systemManager->getBaseUrl();
    }

    // Utility function
    protected function buildPageArray($pagesInfo, $transcribedPages, $navByPage = true){
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

    protected function genDocPagesListForUser($userId, $docId)
    {
        $docInfo = $this->dataManager->getDocById($docId);
        $url = $this->ci->router->pathFor('doc.showdoc', ['id' => $docId]);
        $title = $docInfo['title'];
        $docListHtml = '<li>';
        $docListHtml .= "<a href=\"$url\" title=\"View Document\">$title</a>";
        $docListHtml .= '<br/><span style="font-size: 0.9em">';
        $pageIds = $this->dataManager->getPageIdsTranscribedByUser($userId, $docId);

        $nPagesInLine = 0;
        $maxPagesInLine = 25;
        foreach($pageIds as $pageId) {
            $nPagesInLine++;
            if ($nPagesInLine > $maxPagesInLine) {
                $docListHtml .= "<br/>";
                $nPagesInLine = 1;
            }
            $pageInfo = $this->dataManager->getPageInfo($pageId);
            $pageNum = is_null($pageInfo['foliation']) ? $pageInfo['seq'] : $pageInfo['foliation'];
            $pageUrl = $this->ci->router->pathFor('pageviewer.docseq', ['doc' => $docId, 'seq'=>$pageInfo['seq']]);
            $docListHtml .= "<a href=\"$pageUrl\" title=\"View Page\">$pageNum</a>&nbsp;&nbsp;";
        }
        $docListHtml .= '</span></li>';

        return $docListHtml;
    }

}
