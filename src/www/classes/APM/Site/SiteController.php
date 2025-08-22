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
use ThomasInstitut\DataCache\ItemNotInCacheException;
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


    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;

    const string VITE_DEV_BASE = 'http://localhost:5173';

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

    protected function getLanguagesByCode(): array
    {
        return $this->buildLanguageByCodeArray($this->getLanguages());
    }

    protected function getLanguages(): array
    {
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
            $this->logger->error("System Error while getting SiteUserInfo: " . $e->getMessage(), ['userTid' => $this->userId]);
            // should never happen
            return [];
        }
    }

    private function buildLanguageByCodeArray(array $languagesConfigArray): array
    {
        $langArrayByCode = [];
        foreach ($languagesConfigArray as $lang) {
            $langArrayByCode[$lang['code']] = $lang;
        }
        return $langArrayByCode;
    }

    private function getVersionTagLine(): string
    {
        $tagLine = $this->config['version'] . " (" . $this->config['versionDate'] . ")";
        if ($this->config['versionExtra'] !== '') {
            $tagLine .= ' ' . $this->config['versionExtra'];
        }
        return $tagLine;
    }

    private function getCommonData(): array
    {
        return [
            'appName' => $this->config['appName'],
            'appVersion' => $this->getVersionTagLine(),
            'copyrightNotice' => $this->config['copyrightNotice'],
            'renderTimestamp' => time(),
            'cacheDataId' => $this->config['jsAppCacheDataId'],
            'userInfo' => $this->getSiteUserInfo(),
            'showLanguageSelector' => $this->config['siteShowLanguageSelector'],
            'baseUrl' => $this->getBaseUrl()
        ];
    }


    /**
     * Returns the JS literal representation of a PHP variable
     * @param array $phpVar
     * @return string
     */
    private function getJsObject(mixed $phpVar): string
    {
        if (is_null($phpVar)) {
            return 'null';
        }
        if (is_string($phpVar)) {
            return "\"" . $this->escapeStringForJs($phpVar) . "\"";
        }
        if (is_bool($phpVar)) {
            return $phpVar ? 'true' : 'false';
        }
        if (is_integer($phpVar) || is_float($phpVar) || is_double($phpVar)) {
            return "$phpVar";
        }
        $isObject = false;
        if (is_object($phpVar)) {
            $phpVar = get_object_vars($phpVar);
            $isObject = true;
        }
        if (is_array($phpVar)) {
            $keys = array_keys($phpVar);
            if (count($keys) > 0) {
                if ($keys[0] === 0) {
                    // normal array with numeric keys
                    return "[" .
                        implode(", ", array_map(function ($key) use ($phpVar) {
                            return $this->getJsObject($phpVar[$key]);
                        }, $keys)) .
                        "]";
                } else {
                    // array with string keys (or numeric keys with empty slots)
                    return "{" .
                        implode(", ", array_map(function ($key) use ($phpVar) {
                            return "$key: " . $this->getJsObject($phpVar[$key]);
                        }, $keys)) .
                        "}";
                }
            } else {
                return $isObject ? '{}' : '[]';
            }
        }

        return '';

    }

    private function escapeStringForJs(string $string): string
    {
        $string = preg_replace('/\n/', '\n', $string);
        return preg_replace('/\"/', '\"', $string);
    }

    /**
     *
     * Renders a standard page with the given parameters
     *
     * Pass null or an empty cache key to disable caching.
     *
     * @param ResponseInterface $response
     * @param string $cacheKey
     * @param string $title
     * @param string $jsClassName
     * @param string $viteEntryPoint
     * @param array|null $data
     * @param array $extraViteEntryPoints
     * @param array $extraCss
     * @param array $extraJss
     * @param bool $withJsOptions
     * @return ResponseInterface
     */
    protected function renderStandardPage(ResponseInterface $response,
                                          string            $cacheKey, string $title,
                                          string            $jsClassName,
                                          string            $viteEntryPoint,
                                          ?array            $data = null,
                                          array             $extraViteEntryPoints = [],
                                          array             $extraCss = [],
                                          array             $extraJss = [],
                                          bool              $withJsOptions = true
    ): ResponseInterface
    {
        SystemProfiler::lap("Ready to render");
        if ($cacheKey !== '' && !$this->systemManager->getConfig()['devMode']) {
            $cacheKey = implode(':', ['Site', $this->config['version'], $cacheKey]);
            try {
                $html = $this->systemManager->getSystemDataCache()->get($cacheKey);
                $response->getBody()->write($html);
                SystemProfiler::lap('Cached Response ready');
                $this->logger->debug(sprintf("SITE PROFILER %s Finished in %.3f ms", SystemProfiler::getName(), SystemProfiler::getTotalTimeInMs()),
                    SystemProfiler::getLaps());
                return $response;
            } catch (ItemNotInCacheException) {
                // just continue
            }
        }


        $baseUrl = $this->getBaseUrl();

        $cssItems = [];
        $cssItems[] = 'node_modules/bootstrap/dist/css/bootstrap.css';
        $cssItems[] = 'node_modules/bootstrap-icons/font/bootstrap-icons.css';
        $cssItems[] = 'css/styles.css';
        foreach ($extraCss as $css) {
            $cssItems[] = "css/$css";
        }

        $jsItems = [];
        $jsItems[] = 'node_modules/jquery/dist/jquery.min.js';
        $jsItems[] = 'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js';
        $jsItems = [...$jsItems, ...$extraJss];

        $cssHtml = implode("\n", array_map(function ($cssItem) use ($baseUrl) {
            return "<link rel=\"stylesheet\" type=\"text/css\" href=\"$baseUrl/$cssItem\"/>";
        }, $cssItems));

        $jsHtml = implode("\n", array_map(function ($js) use ($baseUrl) {
            return "<script type=\"text/javascript\" src=\"$baseUrl/$js\"></script>";
        }, $jsItems));

        if ($withJsOptions) {
            $commonData = $this->getCommonData();
            $jsOptions = ['commonData' => $commonData];
            if ($data !== null) {
                foreach ($data as $key => $value) {
                    $jsOptions[$key] = $value;
                }
            }
            $dataJs = $this->getJsObject($jsOptions);
            $script = "$(() => {new $jsClassName(( $dataJs)) });";
        } else {
            $script = "$(() => {new $jsClassName(); });";
        }


        $viteImportsHtml = $this->getViteImportHtml([$viteEntryPoint, ...$extraViteEntryPoints]);
        $viteReactPluginHtml = $this->getReactPluginModuleHtml();


        $html = <<<END
<!doctype html>
<html lang="en">
<head>
    $viteReactPluginHtml
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href='$baseUrl/images/apm-logo-square-32x32.png' rel='icon' sizes='32x32' type='image/png'>
     $cssHtml
    <title>$title</title>
    <style>
        .loader {
            margin-top: 1em;
            border: 1em solid #f3f3f3; /* Light grey */
            border-top: 1em solid gray; /* Blue */
            border-radius: 50%;
            width: 4em;
            height: 4em;
            animation: spin 2s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
</style>
</head>
<body>
    <script>
       window.loading = true;
       setTimeout( () => {
         if (window.loading) {
            document.body.innerHTML = '<div style="margin: 40px; color: gray">APM is taking some time to load the $title page, please stand by... <div class="loader"></div></div>';
            setTimeout( () => {
              if (window.loading) {
              document.body.innerHTML = '<div style="margin: 40px; color: red">Oops, something went wrong loading APM\'s $title page. Please try again.</div>';
              }
            }, 30000)
         }
       }, 500);
</script>
</body>
    $jsHtml
    $viteImportsHtml
<script>
    $script
</script>   
</html>        
END;
        $response->getBody()->write($html);
        if ($cacheKey !== '') {
            $this->systemManager->getSystemDataCache()->set($cacheKey, $html, 3600);
        }
        SystemProfiler::lap('Response ready');
        $this->logger->debug(sprintf("SITE PROFILER %s Finished in %.3f ms", SystemProfiler::getName(), SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
        return $response;
    }

    protected function getReactPluginModuleHtml(): string
    {
        if ($this->systemManager->getConfig()['devMode']) {
            $html = <<<END
<script type="module">
  import RefreshRuntime from '%s/@react-refresh'
  RefreshRuntime.injectIntoGlobalHook(window)
  window.\$RefreshReg$ = () => {}
  window.\$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>
END;
            return sprintf($html, self::VITE_DEV_BASE);
        }
        return '';
    }

    protected function getViteImportHtml(array $viteEntryPoints): string
    {
        if ($this->systemManager->getConfig()['devMode']) {
            $viteImportsHtml = sprintf(
                "<script type=\"module\" src=\"%s/@vite/client\"></script>",
                self::VITE_DEV_BASE
            );
            foreach ($viteEntryPoints as $viteEntryPoint) {
                $viteImportsHtml .= sprintf(
                    "<script type=\"module\" src=\"%s/$viteEntryPoint\"></script>",
                    self::VITE_DEV_BASE
                );
            }
        } else {
            $baseUrl = $this->getBaseUrl();
            $viteImports = [];
            foreach ($viteEntryPoints as $entryPoint) {
                $viteImports = [...$viteImports, ... $this->getViteImportsFromManifest($entryPoint)];
            }
            $this->logger->debug("Vite imports: " . implode(', ', $viteImports));
            $viteImportsHtml = '';
            foreach ($viteImports as $import) {
                $viteImportsHtml .= <<<END
    <script type="module" src="$baseUrl/dist/$import"></script>
END;
            }
        }
        return $viteImportsHtml;
    }

    protected function getViteImportsFromManifest(string $entryPoint): array
    {
        $manifestFileName = './dist/.vite/manifest.json';
        $manifestFileContents = file_get_contents($manifestFileName);
        if ($manifestFileContents === false) {
            $this->logger->error("Vite manifest file not found: $manifestFileName");
            return [];
        }
        $manifest = json_decode($manifestFileContents, true);
        if (!isset($manifest[$entryPoint])) {
            $this->logger->error("Page $entryPoint not found in Vite manifest");
            return [];
        }

        $imports = [];
        $imports[] = $manifest[$entryPoint]["file"];
        foreach ($manifest[$entryPoint]["imports"] as $import) {
            if (!isset($manifest[$import])) {
                $this->logger->error("Import $import not found in Vite manifest");
                continue;
            }
            $imports[] = $manifest[$import]["file"];
        }
        return $imports;
    }

    /**
     * @param ResponseInterface $response
     * @param string $template
     * @param array $data
     * @param bool $withBaseData
     * @return ResponseInterface
     */
    protected function renderPage(ResponseInterface $response,
                                  string            $template, array $data,
                                  bool              $withBaseData = true): ResponseInterface
    {

        if ($withBaseData) {
            $data['commonData'] = $this->getCommonData();
            $data['baseUrl'] = $this->getBaseUrl();
        }
        try {
            $responseToReturn = $this->systemManager->getTwig()->render($response, $template, $data);
            SystemProfiler::lap('Response ready');
            $this->logger->info("SITE PROFILER " . SystemProfiler::getName(), SystemProfiler::getLaps());
            return $responseToReturn;
        } catch (LoaderError|RuntimeError|SyntaxError $e) {
            $this->logger->error("Twig error rendering page: " . $e->getMessage(), ['exception' => get_class($e)]);
            return $this->getSystemErrorPage($response, "Error rendering page", []);
        }
    }

    protected function getSystemErrorPage(ResponseInterface $response, string $errorMessage,
                                          array             $errorData, int $httpStatus = HttpStatus::INTERNAL_SERVER_ERROR): ResponseInterface
    {
        $this->logger->error("System Error: " . $errorMessage, $errorData);
        return $this->getBasicErrorPage($response, "System Error", $errorMessage, $httpStatus);

    }

    protected function getBasicErrorPage(ResponseInterface $response, string $title, string $errorMessage, int $httpStatus): ResponseInterface
    {

        $html = "<!DOCTYPE html><html lang='en'><head><title>$title</title></head><body><h1>APM Error</h1><p>$errorMessage</p></body></html>";
        $response->getBody()->write($html);
        return $response->withStatus($httpStatus);
    }

    protected function getErrorPage(ResponseInterface $response, string $title, string $errorMessage, int $httpStatus): ResponseInterface
    {

        return $this->renderStandardPage(
            $response,
            '',
            $title,
            'ErrorPage',
            'js/pages/ErrorPage.ts',
            [
                'errorMessage' => $errorMessage,
                'title' => $title
            ],
            [],
            ['error_page.css']
        )->withStatus($httpStatus);

    }

    protected function getBaseUrl(): string
    {
        return $this->systemManager->getBaseUrl();
    }

    /**
     * Utility function to create an array of custom page info for the
     * document and page viewer website pages.
     *
     * @param array $legacyPageInfoArray
     * @param int[] $transcribedPages array with the page numbers that have transcriptions
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
            if (!in_array($page['page_number'], $transcribedPages)) {
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


    protected function getNormalizerData(string $language, string $category): array
    {
        $normalizerManager = $this->systemManager->getNormalizerManager();

        $standardNormalizerNames = $normalizerManager->getNormalizerNamesByLangAndCategory($language, $category);
        $normalizerData = [];
        foreach ($standardNormalizerNames as $normalizerName) {
            $normalizerData[] = [
                'name' => $normalizerName,
                'metadata' => $normalizerManager->getNormalizerMetadata($normalizerName)
            ];
        }
        return $normalizerData;
    }


}
