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
use APM\System\ApmConfigParameter;
use APM\System\ApmImageType;
use APM\System\Person\PersonNotFoundException;
use APM\System\User\UserNotFoundException;
use APM\SystemProfiler;
use APM\System\ApmContainerKey;
use APM\ToolBox\HttpStatus;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use APM\System\ApmSystemManager;
use AverroesProject\Data\DataManager;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Slim\Psr7\Response;
use Slim\Routing\RouteParser;
use Slim\Views\Twig;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\Profiler\SimpleProfiler;
use ThomasInstitut\Profiler\TimeTracker;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;


/**
 * Site Controller class
 *
 */
class SiteController implements LoggerAwareInterface, CodeDebugInterface
{

    const COOKIE_SIZE_THRESHOLD = 1000;

    const TEMPLATE_ERROR_PAGE = 'error-page.twig';


    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;

    protected ContainerInterface $container;
    protected ApmSystemManager $systemManager;
    protected Twig $view;
    protected array $config;
    /**
     * @var DataManager
     * @deprecated get it from $this->systemManager
     */
    protected DataManager $dataManager;
    protected bool $userAuthenticated;
    /**
     * @var array|null
     * @deprecated use getSiteUserInfo())
     */
    protected ?array $siteUserInfo;
    protected RouteParser $router;
    /**
     * @var array
     * @deprecated use getLanguages()
     */
    protected array $languages;
    protected SimpleProfiler $profiler;

    /**
     * @var array
     * @deprecated use getLanguagesByCode();
     */
    protected array $languagesByCode;
    protected int $userTid;

    /**
     * SiteController constructor.
     * @param ContainerInterface $ci
     * @throws ContainerExceptionInterface
     * @throws LoaderError
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
        $this->view = $this->systemManager->getTwig();
        $this->config = $this->systemManager->getConfig();
        $this->logger = $this->systemManager->getLogger();
        $this->router = $this->systemManager->getRouter();
        $this->userAuthenticated = false;


        $this->siteUserInfo = null;
        $this->dataManager = $this->systemManager->getDataManager();
        $this->languages = $this->getLanguages();
        $this->languagesByCode = $this->getLanguagesByCode();

        $this->profiler = new SimpleProfiler();
        $this->profiler->registerProperty('time', new TimeTracker());
        $this->profiler->registerProperty('mysql-queries', $this->systemManager->getSqlQueryCounterTracker());
        $this->profiler->registerProperty('cache', $this->systemManager->getCacheTracker());

       
       // Check if the user has been authenticated by the authentication middleware
        //$this->logger->debug('Checking user authentication');
        if ($ci->has(ApmContainerKey::SITE_USER_TID)) {
           $this->userAuthenticated = true;
           $this->userTid = $ci->get(ApmContainerKey::SITE_USER_TID);
           $this->siteUserInfo = $this->getSiteUserInfo();
        }
    }

    protected function getLanguagesByCode() : array {
        return $this->buildLanguageByCodeArray($this->getLanguages());
    }

    protected function getLanguages() : array {
        return $this->systemManager->getConfig()[ApmConfigParameter::LANGUAGES];
    }

    /**
     *
     * Gets an array with info about the user.
     * This is sent to all pages
     *
     */
    protected function getSiteUserInfo(): array
    {
        try {
            $userData = $this->systemManager->getUserManager()->getUserData($this->userTid);
            $personData = $this->systemManager->getPersonManager()->getPersonEssentialData($this->userTid);

            $userInfo = $userData->getExportObject();
            unset($userInfo['passwordHash']);
            $userInfo['name'] = $personData->name;
            $userInfo['email'] = '';
            $userInfo['isRoot'] = $userData->root;
            $userInfo['manageUsers'] = $userData->root;
            $userInfo['tidString'] = Tid::toBase36String($userData->tid);
            return $userInfo;
        } catch (UserNotFoundException|PersonNotFoundException $e) {
            $this->logger->error("System Error: " . $e->getMessage());
            // should never happen
            return [];
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


    /**
     * @param ResponseInterface $response
     * @param string $template
     * @param array $data
     * @param bool $withBaseData
     * @param bool $includeLegacyData
     * @return ResponseInterface
     */
    protected function renderPage(ResponseInterface $response,
                                  string $template, array $data,
                                  bool $withBaseData = true, bool $includeLegacyData = true): ResponseInterface
    {

        if ($withBaseData) {
            if ($includeLegacyData) {
                // legacy data for old code pages
                // this will disappear eventually
                $data['copyright']  = $this->getCopyrightNotice();
                $data['baseurl'] = $this->getBaseUrl();
                $data['userAuthenticated'] = $this->userAuthenticated;
                $data['userId'] = -1;
                $data['userTid'] = $this->userTid;
                $data['userInfo'] = $this->getSiteUserInfo();
            }
            // Data for new code pages (e.g. ApmPage js class descendants)
            $commonData = [];
            $commonData['appName'] = $this->config[ApmConfigParameter::APP_NAME];
            $commonData['appVersion'] = $this->config[ApmConfigParameter::VERSION];
            $commonData['copyrightNotice'] = $this->config[ApmConfigParameter::COPYRIGHT_NOTICE];
            $commonData['renderTimestamp'] =  time();
            $commonData['cacheDataId'] = $this->config[ApmConfigParameter::JS_APP_CACHE_DATA_ID];
            $commonData['userInfo'] = $this->getSiteUserInfo();
            $commonData['showLanguageSelector'] = $this->config[ApmConfigParameter::SITE_SHOW_LANGUAGE_SELECTOR];
            $commonData['baseUrl'] = $this->getBaseUrl();
            $data['commonData'] = $commonData;
        }

        $responseToReturn = new Response();
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
            return $this->getSystemErrorPage($response, $errorMessage, []);
        }
        SystemProfiler::lap('Response ready');
        $this->logger->info("SITE PROFILER " . SystemProfiler::getName(), SystemProfiler::getLaps());
        return $responseToReturn;
    }

    protected function getSystemErrorPage(ResponseInterface $response, string $errorMessage,
                                          array $errorData, int $httpStatus  = HttpStatus::INTERNAL_SERVER_ERROR) :ResponseInterface{
        $this->logger->error("System Error: " . $errorMessage, $errorData);
        return $this->getBasicErrorPage($response, "System Error", $errorMessage, $httpStatus);

    }

    protected function getBasicErrorPage(ResponseInterface $response, string $title, string $errorMessage, int $httpStatus) : ResponseInterface
    {

        $html = "<!DOCTYPE html><html lang='en'><head><title>$title</title></head><body><h1>APM Error</h1><p>$errorMessage</p></body></html>";
        $response->getBody()->write($html);
        return $response->withStatus($httpStatus);
    }

    protected function getErrorPage(ResponseInterface $response, string $title, string $errorMessage, int $httpStatus) : ResponseInterface
    {
        return $this->renderPage($response, self::TEMPLATE_ERROR_PAGE,
            [
                'errorMessage' => $errorMessage,
                'title' => $title
            ],
            true, false)->withStatus($httpStatus);


    }
    
    protected function getCopyrightNotice() : string {
        return '';
    }
    
    protected function getBaseUrl() : string {
        return $this->systemManager->getBaseUrl();
    }

    // Utility function
    protected function buildPageArray($pagesInfo, $transcribedPages): array
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
            if (!in_array($page['page_number'], $transcribedPages)){
                $thePage['classes'] =
                    $thePage['classes'] . ' withouttranscription';
            }
            $thePage['classes'] .= ' type' . $page['type'];
            $thePages[] = $thePage;
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
            $thePage['isDeepZoom'] = $docInfo['deep_zoom'];
            $thePage['isTranscribed'] = in_array($pageInfo->pageNumber, $transcribedPages);
            $thePage['imageUrl'] = $this->dataManager->getImageUrl($docInfo['id'], $pageInfo->imageNumber);
            $thePage['jpgUrl'] = $this->dataManager->getImageUrl($docInfo['id'], $pageInfo->imageNumber, ApmImageType::IMAGE_TYPE_JPG);
            $thePage['thumbnailUrl'] = $this->dataManager->getImageUrl($docInfo['id'], $pageInfo->imageNumber, ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL);
            $thePages[$pageInfo->pageId] = $thePage;
        }
        return $thePages;
    }


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

    protected function reportCookieSize() : void {
        $cookieString = $_SERVER['HTTP_COOKIE'] ?? 'N/A';
        if (strlen($cookieString) > self::COOKIE_SIZE_THRESHOLD) {
            $this->codeDebug("Got a cookie string of " . strlen($cookieString) . " bytes for user " . $this->siteUserInfo['id']);
        }
    }


}
