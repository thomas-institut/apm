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
class SiteController
{
    protected $ci;
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->hm = $ci->hm;
       $this->systemManager = $ci->sm;
       $config = $this->ci->settings;
       $this->ci->copyrightNotice  = $config['app_name'] . " v" . 
               $config['version'] . " &bull; &copy; " . 
               $config['copyright_notice'] . " &bull; " .  
               strftime("%d %b %Y, %H:%M:%S %Z");
    }

    protected function genDocPagesListForUser($userId, $docId)
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
    
}
