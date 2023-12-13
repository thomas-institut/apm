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
use APM\SystemProfiler;
use APM\Plugin\HookManager;
use APM\System\ApmContainerKey;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\RequestInterface;
use \Psr\Http\Message\ResponseInterface as Response;
use APM\System\ApmSystemManager;
use AverroesProject\Data\DataManager;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Slim\Routing\RouteParser;
use Slim\Views\Twig;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\Profiler\SimpleProfiler;
use ThomasInstitut\Profiler\TimeTracker;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

use \Psr\Http\Message\ServerRequestInterface as Request;

/**
 * Site Controller class
 *
 */
class SiteController implements LoggerAwareInterface, CodeDebugInterface
{

    const COOKIE_SIZE_THRESHOLD = 1000;
    const TEMPLATE_ERROR_NOT_ALLOWED = 'error-not-allowed.twig';


    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;
    /**
     * @var ContainerInterface
     */
    protected ContainerInterface $container;
    
    /** @var ApmSystemManager */
    protected $systemManager;
    
    /** @var Twig */
    protected $view;
    
    /** @var array */
    protected $config;
    
    /** @var DataManager */
    protected $dataManager;
    
    /** @var bool */
    protected bool $userAuthenticated;
    
    /** @var array */
    protected $userInfo;

    /**
     * @var HookManager
     */
    protected HookManager $hookManager;

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
    protected SimpleProfiler $profiler;
    /**
     * @var array
     */
    protected array $languagesByCode;

    /**
     * SiteController constructor.
     * @param ContainerInterface $ci
     * @throws LoaderError
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
        $this->view = $this->systemManager->getTwig();
        $this->config = $this->systemManager->getConfig();
        $this->dataManager = $this->systemManager->getDataManager();
        $this->hookManager = $this->systemManager->getHookManager();
        $this->logger = $this->systemManager->getLogger();
        $this->router = $this->systemManager->getRouter();
        $this->userAuthenticated = false;
        $this->userInfo = [];
        $this->languages = $this->config['languages'];
        $this->languagesByCode = $this->buildLanguageByCodeArray($this->languages);

        $this->profiler = new SimpleProfiler();
        $this->profiler->registerProperty('time', new TimeTracker());
        $this->profiler->registerProperty('mysql-queries', $this->systemManager->getSqlQueryCounterTracker());
        $this->profiler->registerProperty('cache', $this->systemManager->getCacheTracker());

       
       // Check if the user has been authenticated by the authentication middleware
        //$this->logger->debug('Checking user authentication');
        if ($ci->has(ApmContainerKey::USER_INFO)) {
           $this->userAuthenticated = true;
           $this->userInfo = $ci->get(ApmContainerKey::USER_INFO);
        }
    }

    private function buildLanguageByCodeArray(array $languagesConfigArray) : array {
        $langArrayByCode = [];
        foreach($languagesConfigArray as $lang) {
            $langArrayByCode[$lang['code']] = $lang;
        }
        return $langArrayByCode;
    }

    protected function logProfilerData(string $pageTitle, $fullLapInfo = false) : void
    {
        $lapInfo = $this->profiler->getLaps();
        $totalTimeInMs = $this->getProfilerTotalTime() * 1000;
        $totalQueries = $lapInfo[count($lapInfo)-1]['mysql-queries']['cumulative']['Total'];
        $cacheHits = $lapInfo[count($lapInfo)-1]['cache']['cumulative']['hits'];
        $cacheMisses = $lapInfo[count($lapInfo)-1]['cache']['cumulative']['misses'];
        $info = $fullLapInfo ? $lapInfo :[];
        $this->logger->debug(sprintf("PROFILER %s, finished in %0.2f ms, %d MySql queries, %d cache hits, %d misses",
            $pageTitle, $totalTimeInMs, $totalQueries, $cacheHits, $cacheMisses), $info);
    }

    protected function getProfilerTotalTime() : float
    {
        $lapInfo = $this->profiler->getLaps();
        return $lapInfo[count($lapInfo)-1]['time']['cumulative'];
    }

//    protected function responseWithText(Response $response, string $text, int $status=200) : Response {
//        $response->getBody()->write($text);
//        return $response->withStatus($status);
//    }

    /**
     * @param Response $response
     * @param string $template
     * @param array $data
     * @param bool $withBaseData
     * @return \Slim\Psr7\Response|Response
     */
    protected function renderPage(Response $response, string $template, array $data, bool $withBaseData = true): \Slim\Psr7\Response|Response
    {



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
        SystemProfiler::lap('Response ready');
        $this->logger->debug("GLOBAL PROFILER", SystemProfiler::getLaps());
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
              date("Y-M-d, H:i:s T");
    }
    
    protected function getBaseUrl() : string {
        return $this->systemManager->getBaseUrl();
    }

    protected function getAbsoluteBaseUrlFromRequest(RequestInterface $request) : string{
        $path = $request->getUri();

        return rtrim($path, '/');
    }

    // Utility function
    protected function buildPageArray($pagesInfo, $transcribedPages, $navByPage = true): array
    {
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
    protected function buildPageArrayNew(array $pagesInfo, array $transcribedPages, $docInfo): array
    {
        $thePages = [];
        foreach ($pagesInfo as $pageInfo) {
            /** @var $pageInfo PageInfo */
            $thePage = get_object_vars($pageInfo);
//            $thePage['classes'] = '';
            $thePage['imageSource'] = $docInfo['image_source'];
            $thePage['isDeepZoom'] = $docInfo['image_source'] === 'dare-deepzoom';
            $thePage['isTranscribed'] = in_array($pageInfo->pageNumber, $transcribedPages);
            $thePage['imageUrl'] =  $this->hookManager->callHookedMethods('get-image-url-' . $docInfo['image_source'],
                [
                    'imageNumber' => $pageInfo->imageNumber,
                    'imageSourceData' => $docInfo['image_source_data']
                ]);
            $thePage['thumbnailUrl'] =  $this->hookManager->callHookedMethods('get-thumbnail-url-' . $docInfo['image_source'],
                [
                    'imageNumber' => $pageInfo->imageNumber,
                    'imageSourceData' => $docInfo['image_source_data']
                ]);
            $thePages[$pageInfo->pageId] = $thePage;
        }
        return $thePages;
    }

//    protected function genDocPagesListForUser($userId, $docId): string
//    {
//        $docInfo = $this->dataManager->getDocById($docId);
//        $url = $this->router->urlFor('doc.showdoc', ['id' => $docId]);
//        $title = $docInfo['title'];
//        $docListHtml = '<li>';
//        $docListHtml .= "<a href=\"$url\" title=\"View Document\">$title</a>";
//        $docListHtml .= '<br/><span style="font-size: 0.9em">';
//        $pageIds = $this->dataManager->getPageIdsTranscribedByUser($userId, $docId);
//
//        $nPagesInLine = 0;
//        $maxPagesInLine = 25;
//        foreach($pageIds as $pageId) {
//            $nPagesInLine++;
//            if ($nPagesInLine > $maxPagesInLine) {
//                $docListHtml .= "<br/>";
//                $nPagesInLine = 1;
//            }
//            $pageInfo = $this->dataManager->getPageInfo($pageId);
//            $pageNum = is_null($pageInfo['foliation']) ? $pageInfo['seq'] : $pageInfo['foliation'];
//            $pageUrl = $this->router->urlFor('pageviewer.docseq', ['doc' => $docId, 'seq'=>$pageInfo['seq']]);
//            $docListHtml .= "<a href=\"$pageUrl\" title=\"View page in new tab\" target=\"_blank\">$pageNum</a>&nbsp;&nbsp;";
//        }
//        $docListHtml .= '</span></li>';
//
//        return $docListHtml;
//    }


    protected function getNormalizerData(string $language, string $category) : array {
        $normalizerManager = $this->systemManager->getNormalizerManager();

        $standardNormalizerNames = $normalizerManager->getNormalizerNamesByLangAndCategory($language, $category);
        $normalizerData = [];
        foreach($standardNormalizerNames as $normalizerName) {
            $normalizerData[] = [
                'name' => $normalizerName,
                'metadata' => $normalizerManager->getNormalizerMetadata($normalizerName)
            ];
        }
        return $normalizerData;
    }

    protected function reportCookieSize() {
        $cookieString = $_SERVER['HTTP_COOKIE'] ?? 'N/A';
        if (strlen($cookieString) > self::COOKIE_SIZE_THRESHOLD) {
            $this->codeDebug("Got a cookie string of " . strlen($cookieString) . " bytes for user " . $this->userInfo['id']);
        }
    }


}
