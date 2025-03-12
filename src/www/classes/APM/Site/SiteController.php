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

use APM\System\ApmContainerKey;
use APM\System\ApmImageType;
use APM\System\ApmSystemManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Person\PersonNotFoundException;
use APM\System\User\UserNotFoundException;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use RuntimeException;
use Slim\Routing\RouteParser;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\EntitySystem\Tid;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;


/**
 * Site Controller class
 *
 */
class SiteController implements LoggerAwareInterface, CodeDebugInterface
{

    const string TEMPLATE_ERROR_PAGE = 'error-page.twig';


    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;

    protected ContainerInterface $container;
    protected ApmSystemManager $systemManager;
    protected array $config;

    protected bool $userAuthenticated;
    protected RouteParser $router;
    protected int $userId;

    /**
     * SiteController constructor.
     * @param ContainerInterface $ci
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
        $this->config = $this->systemManager->getConfig();
        $this->logger = $this->systemManager->getLogger();
        $this->router = $this->systemManager->getRouter();
        $this->userAuthenticated = false;

       // Check if the user has been authenticated by the authentication middleware
        //$this->logger->debug('Checking user authentication');
        if ($ci->has(ApmContainerKey::SITE_USER_ID)) {
           $this->userAuthenticated = true;
           $this->userId = $ci->get(ApmContainerKey::SITE_USER_ID);
        }
    }

    protected function getLanguagesByCode() : array {
        return $this->buildLanguageByCodeArray($this->getLanguages());
    }

    protected function getLanguages() : array {
        return $this->systemManager->getConfig()['languages'];
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
            $userData = $this->systemManager->getUserManager()->getUserData($this->userId);
            $personData = $this->systemManager->getPersonManager()->getPersonEssentialData($this->userId);

            $userInfo = $userData->getExportObject();
            unset($userInfo['passwordHash']);
            $userInfo['name'] = $personData->name;
            $userInfo['email'] = '';
            $userInfo['isRoot'] = $userData->root;
            $userInfo['manageUsers'] = $userData->root;
            $userInfo['tidString'] = Tid::toBase36String($userData->id);
            return $userInfo;
        } catch (UserNotFoundException|PersonNotFoundException $e) {
            $this->logger->error("System Error while getting SiteUserInfo: " . $e->getMessage(), [ 'userTid' => $this->userId ]);
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

    /**
     * @param ResponseInterface $response
     * @param string $template
     * @param array $data
     * @param bool $withBaseData
     * @return ResponseInterface
     */
    protected function renderPage(ResponseInterface $response,
                                  string $template, array $data,
                                  bool $withBaseData = true): ResponseInterface
    {

        if ($withBaseData) {
            $data['commonData'] = [
                'appName' => $this->config['appName'],
                'appVersion' => $this->config['version'],
                'copyrightNotice' => $this->config['copyrightNotice'],
                'renderTimestamp' =>  time(),
                'cacheDataId' => $this->config['jsAppCacheDataId'],
                'userInfo' => $this->getSiteUserInfo(),
                'showLanguageSelector' => $this->config['siteShowLanguageSelector'],
                'baseUrl' => $this->getBaseUrl()
            ];
            $data['baseUrl'] = $this->getBaseUrl();
        }
        try {
            $responseToReturn = $this->systemManager->getTwig()->render($response, $template, $data);
            SystemProfiler::lap('Response ready');
            $this->logger->info("SITE PROFILER " . SystemProfiler::getName(), SystemProfiler::getLaps());
            return $responseToReturn;
        } catch (LoaderError|RuntimeError|SyntaxError $e) {
            $this->logger->error("Twig error rendering page: " . $e->getMessage(), [ 'exception' => get_class($e)]);
            return $this->getSystemErrorPage($response, "Error rendering page", []);
        }
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
            ])->withStatus($httpStatus);


    }

    protected function getBaseUrl() : string {
        return $this->systemManager->getBaseUrl();
    }

    /**
     * Utility function to create an array of custom page info for the
     * document and page viewer website pages.
     *
     * @param array $legacyPageInfoArray
     * @param int[] $transcribedPages  array with the page numbers that have transcriptions
     * @return array
     */
    protected function buildPageArray(array $legacyPageInfoArray, array $transcribedPages): array
    {
        $thePages = [];
        foreach ($legacyPageInfoArray as $page) {
            $thePage = [];
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
    protected function buildPageArrayNew(array $legacyPageInfoArray, array $transcribedPages, array $legacyDocInfo): array
    {
        $thePages = [];
        $docManager = $this->systemManager->getDocumentManager();
        $imageSources = $this->systemManager->getImageSources();
        foreach ($legacyPageInfoArray as $legacyPageInfo) {
            try {
                $thePage = $legacyPageInfo;
                $pageNumber = $legacyPageInfo['page_number'];
                $thePage['pageId'] = $legacyPageInfo['id'];
                $thePage['sequence'] = $legacyPageInfo['seq'];
                $thePage['pageNumber'] = $legacyPageInfo['page_number'];
                $thePage['imageNumber'] = $legacyPageInfo['img_number'];
                $thePage['numCols'] = $legacyPageInfo['num_cols'];
                $thePage['imageSource'] = $legacyDocInfo['image_source'];
                $thePage['isDeepZoom'] = $legacyDocInfo['deep_zoom'];
                $thePage['isTranscribed'] = in_array($pageNumber, $transcribedPages);

                $thePage['imageUrl'] = $docManager->getImageUrl($legacyDocInfo['id'],
                    $pageNumber, ApmImageType::IMAGE_TYPE_DEFAULT, $imageSources);
                $thePage['jpgUrl'] = $docManager->getImageUrl($legacyDocInfo['id'],
                    $pageNumber, ApmImageType::IMAGE_TYPE_JPG, $imageSources);
                $thePage['thumbnailUrl'] = $docManager->getImageUrl($legacyDocInfo['id'],
                    $pageNumber, ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL, $imageSources);
//                $this->logger->debug("The page", $thePage);
                $thePages[$legacyPageInfo['id']] = $thePage;
            } catch (DocumentNotFoundException $e) {
                // should never happen
                throw new RuntimeException("Document not found:" . $e->getMessage());
            }
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


}
