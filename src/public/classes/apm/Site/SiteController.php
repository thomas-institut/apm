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

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use APM\System\ApmSystemManager;
use AverroesProject\Data\DataManager;

/**
 * Site Controller class
 *
 */
class SiteController
{
    
    /** @var ApmSystemManager */
    protected $systemManager;
    
    /** @var \Slim\Views\Twig */
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
     * @var \Monolog\Logger
     */
    protected $logger;
    
    //Constructor
    public function __construct($ci)
    {
        $this->systemManager = $ci->sm;
        $this->view = $ci->view;
        $this->config = $ci->config;
        $this->dataManager = $ci->db;
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
}
