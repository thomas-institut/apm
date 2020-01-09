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

use APM\FullTranscription\PageInfo;
use APM\Plugin\HookManager;
use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use Matrix\Exception;
use Monolog\Logger;
use \Psr\Http\Message\ResponseInterface as Response;
use APM\System\ApmSystemManager;
use AverroesProject\Data\DataManager;
use Slim\Psr7\Stream;
use Slim\Routing\RouteParser;
use Slim\Views\Twig;
use ThomasInstitut\Profiler\SimpleProfiler;
use ThomasInstitut\Profiler\TimeTracker;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

/**
 * Site Controller class
 *
 */
class SiteController
{
    /**
     * @var Container
     */
    private $container;
    
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


    /**
     * @var RouteParser
     */
    protected $router;

    /**
     * @var array
     */
    protected $languages;
    /**
     * @var SimpleProfiler
     */
    protected $profiler;

    /**
     * SiteController constructor.
     * @param Container $ci
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function __construct(Container $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get('systemManager');
        $this->view = $ci->get('view');
        $this->config = $ci->get('config');
        $this->dataManager = $ci->get('dataManager');
        $this->hookManager = $this->systemManager->getHookManager();
        $this->logger = $this->systemManager->getLogger();
        $this->router = $ci->get('router');
        $this->userAuthenticated = false;
        $this->userInfo = [];
        $this->languages = $ci->get('config')['languages'];

        $this->profiler = new SimpleProfiler();
        $this->profiler->registerProperty('time', new TimeTracker());
        $this->profiler->registerProperty('mysql-queries', $this->systemManager->getSqlQueryCounterTracker());

       
       // Check if the user has been authenticated by the authentication middleware
        //$this->logger->debug('Checking user authentication');
        if ($ci->has('user_info')) {
           $this->userAuthenticated = true;
           $this->userInfo = $ci->get('user_info');
        }
    }

    protected function logProfilerData(string $pageTitle) : void
    {
        $lapInfo = $this->profiler->getLaps();
        $totalTimeInMs = $lapInfo[count($lapInfo)-1]['time']['cummulative'] * 1000;
        $totalQueries = $lapInfo[count($lapInfo)-1]['mysql-queries']['cummulative']['Total'];
        $this->logger->debug(sprintf("PROFILER %s, finished in %0.2f ms, %d MySql queries", $pageTitle, $totalTimeInMs, $totalQueries), $lapInfo);
    }


    protected function responseWithText(Response $response, string $text, int $status=200) : Response {
        $response->getBody()->write($text);
        return $response->withStatus($status);
    }

    /**
     * @param Response $response
     * @param string $template
     * @param array $data
     * @param bool $withBaseData
     * @return Response
     */
    protected function renderPage(Response $response, string $template, array $data, $withBaseData = true) {
        
        if ($withBaseData) {
            $data['copyright']  = $this->getCopyrightNotice();
            $data['baseurl'] = $this->getBaseUrl();
            $data['userAuthenticated'] = $this->userAuthenticated;
            if ($this->userAuthenticated) {
                $data['userinfo'] = $this->userInfo;
            }
        }

        $responseToReturn = new \Slim\Psr7\Response();
        $twigExceptionRaised = false;
        $errorMessage = '';
        try {
            $responseToReturn = $this->view->render($response, $template, $data);
        } catch (LoaderError $e) {
            $twigExceptionRaised = true;
            $errorMessage = 'Twig LoaderError : ' . $e->getMessage();

        } catch (RuntimeError $e) {
            $twigExceptionRaised = true;
            $errorMessage = 'Twig RuntimeError : ' . $e->getMessage();
        } catch (SyntaxError $e) {
            $twigExceptionRaised = true;
            $errorMessage = 'Twig SyntaxError : ' . $e->getMessage();
        }

        if ($twigExceptionRaised) {
            $this->logger->error("Error rendering page: " . $errorMessage);
            return $this->getBasicErrorPage($response, 'APM Error', 'Page rendering error, please report to APM developers.')->withStatus(409);
        }

        return $responseToReturn;
    }

    protected function getBasicErrorPage(Response $response, string $title, string $errorMessage) : Response
    {

        $html = "<!DOCTYPE html><html lang='en'><head><title>$title</title></head><body><h1>APM Error</h1><p>$errorMessage</p></body></html>";
        $response->getBody()->write($html);
        return $response;
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

    // Utility function
    protected function buildPageArrayNew(array $pagesInfo, array $transcribedPages){
        $thePages = [];
        foreach ($pagesInfo as $pageInfo) {
            /** @var $pageInfo PageInfo */
            $thePage = [];
            $thePage['number'] = $pageInfo->pageNumber;
            $thePage['seq'] = $pageInfo->sequence;
            $thePage['type'] = $pageInfo->type;
            $thePage['foliation'] = $pageInfo->foliation;

            $thePage['classes'] = '';
            $thePage['isTranscribed'] = true;
            if (array_search($pageInfo->pageNumber, $transcribedPages) === false){
                $thePage['classes'] =
                    $thePage['classes'] . ' withouttranscription';
                $thePage['isTranscribed'] = false;
            }
            $thePage['classes'] .= ' type' . $pageInfo->type;
            $thePages[] = $thePage;
        }
        return $thePages;
    }

    protected function genDocPagesListForUser($userId, $docId)
    {
        $docInfo = $this->dataManager->getDocById($docId);
        $url = $this->router->urlFor('doc.showdoc', ['id' => $docId]);
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
            $pageUrl = $this->router->urlFor('pageviewer.docseq', ['doc' => $docId, 'seq'=>$pageInfo['seq']]);
            $docListHtml .= "<a href=\"$pageUrl\" title=\"View Page\">$pageNum</a>&nbsp;&nbsp;";
        }
        $docListHtml .= '</span></li>';

        return $docListHtml;
    }

}
