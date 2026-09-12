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
use APM\System\Cache\SystemMainDataCache;
use APM\System\Config\ApmSystemConfig;
use APM\System\LanguageManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use APM\ToolBox\BaseUrlDetector;
use APM\ToolBox\HttpStatus;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Slim\Interfaces\RouteParserInterface;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\Profiler\SystemProfiler;

/**
 * Site Controller class
 *
 */
class SiteController
{

    const string VITE_DEV_BASE = 'http://localhost:5173';

    protected ContainerInterface $container;

    /**
     * @deprecated use component from SiteController (through container)
     */
    protected SystemManager $systemManager;

    // Default components for all controllers
    protected ApmSystemConfig $systemConfig;
    protected LanguageManager $languageManager;
    protected LoggerInterface $logger;
    protected RouteParserInterface $router;

    protected bool $userAuthenticated;

    protected int $userId;

    /**
     * SiteController constructor.
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;

        /** @var SystemManager $sm */
        $sm = $ci->get(SystemManager::class);
        $this->systemManager = $sm;

        /** @var ApmSystemConfig $sc */
        $sc = $ci->get(ApmSystemConfig::class);
        $this->systemConfig = $sc;

        /** @var LoggerInterface $logger */
        $logger = $ci->get(LoggerInterface::class);
        $this->logger = $logger;

        /** @var RouteParserInterface $router */
        $router = $ci->get(RouteParserInterface::class);
        $this->router = $router;

        /** @var LanguageManager $lm */
        $lm = $ci->get(LanguageManager::class);
        $this->languageManager = $lm;

        // Check if the user has been authenticated by the authentication middleware
        $this->userAuthenticated = false;
        if ($ci->has(ApmContainerKey::SITE_USER_ID)) {
            $this->userAuthenticated = true;
            $this->userId = $ci->get(ApmContainerKey::SITE_USER_ID);
        }
    }



    protected function getLanguages(): array
    {
        $legacyLangArray = [];
        foreach ($this->languageManager->getSupportedTranscriptionLanguageCodes() as $code) {
            $legacyLangArray[] = $this->languageManager->getLegacyLangInfo($code);
        }
        return $legacyLangArray;
    }

    protected function getUserManager(): UserManagerInterface
    {
        try {
            return $this->container->get(UserManagerInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            $this->logger->error("System Error while getting UserManager: " . $e->getMessage());
            throw new RuntimeException("UserManager not found in container", 0, $e);
        }
    }

    protected function getPersonManager(): PersonManagerInterface
    {
        try {
            return $this->container->get(PersonManagerInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            $this->logger->error("System Error while getting PersonManager: " . $e->getMessage());
            throw new RuntimeException("PersonManager not found in container", 0, $e);
        }
    }

    protected function getSystemDataCache(): SystemMainDataCache
    {
        try {
            return $this->container->get(SystemMainDataCache::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            $this->logger->error("System Error while getting SystemDataCache: " . $e->getMessage());
            throw new RuntimeException("SystemDataCache not found in container", 0, $e);
        }
    }

    /**
     *
     * Gets an array with info about the user.
     * This is sent to all standard non-React pages
     *
     */
    protected function getSiteUserInfo(): array
    {
        try {
            $userData = $this->getUserManager()->getUserData($this->userId);
            $personData = $this->getPersonManager()->getPersonEssentialData($this->userId);

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

    private function getVersionTagLine(): string
    {
        $tagLine = $this->systemConfig->version->version . " (" . $this->systemConfig->version->versionDate . ")";
        if ($this->systemConfig->version->versionExtra !== '') {
            $tagLine .= ' ' . $this->systemConfig->version->versionExtra;
        }
        return $tagLine;
    }

    protected function getCommonData(): array
    {
        return [
            'appName' => $this->systemConfig->general->appName,
            'appVersion' => $this->getVersionTagLine(),
            'copyrightNotice' => $this->systemConfig->general->copyrightNotice,
            'renderTimestamp' => time(),
            'cacheDataId' => $this->systemConfig->version->jsAppCacheDataId,
            'userInfo' => $this->getSiteUserInfo(),
            'showLanguageSelector' => $this->systemConfig->general->siteShowLanguageSelector,
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

    protected function getStandardPageHtml(string $baseUrl, string $title, string $headImports, string $postBodyImports): string
    {
        $viteReactPluginHtml = $this->getReactPluginModuleHtml();

        return <<<END
<!doctype html>
<html lang="en">
<head>
    $viteReactPluginHtml
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href='$baseUrl/images/apm-logo-square-32x32.png' rel='icon' sizes='32x32' type='image/png'>
    <title>$title</title>
    $headImports
    <style>
    
        div.loadMessage {
            margin: 20px;
            font-size: 1.2em;
            color: gray;
            animation: appearAfter 1s linear;
        }
        
        @keyframes appearAfter {
            from {
                opacity: 0;
            }
            50% {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        .spinner {
            margin-top: 0.5em;
            border: 0.15em solid #f3f3f3;
            border-top: 0.15em solid gray;
            border-radius: 50%;
            width: 1em;
            height: 1em;
            display: inline-block;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
</style>
<script>
       window.loading = true
       setTimeout( 
         () => {
            if (window.loading) {
              let msgDiv = document.getElementById('message')
              msgDiv.innerHTML = 'Oops, something went wrong loading APM. Is your Internet working? If so, there might be a problem with the server. Please try again later.'
            }
         }, 30000)
</script>
</head>
<body>
    <div class="loadMessage" id="message">
    Loading $title page... <div class="spinner"></div>
    </div>
    
</body>
$postBodyImports
</html>    
END;
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
        if ($cacheKey !== '' && !$this->systemConfig->general->devMode) {
            $cacheKey = implode(':', ['Site', $this->systemConfig->version->version, $cacheKey]);
            try {
                $html = $this->getSystemDataCache()->get($cacheKey);
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
        $prefix = $this->systemConfig->general->devMode ? 'public' : 'dist';

        $cssItems = [];
        $cssItems[] = "$prefix/legacy/bootstrap.css";
        $cssItems[] = "$prefix/legacy/bootstrap-icons.css";
        $cssItems[] = 'css/styles.css';
        foreach ($extraCss as $css) {
            $cssItems[] = "css/$css";
        }

        $jsItems = [];
        $jsItems[] = "$prefix/legacy/jquery.min.js";
        $jsItems[] = "$prefix/legacy/bootstrap.bundle.min.js";
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


        [$viteJsImportsHtml, $viteCssImportsHtml] = $this->getViteImportHtml([$viteEntryPoint, ...$extraViteEntryPoints]);
        $cssHtml = implode('', [$cssHtml, $viteCssImportsHtml]);

        $postBodyImports = implode('', [$jsHtml, $viteJsImportsHtml, "<script> $script </script>"]);
        $html = $this->getStandardPageHtml($baseUrl, $title, $cssHtml, $postBodyImports);
        $response->getBody()->write($html);
        if ($cacheKey !== '') {
            $this->getSystemDataCache()->set($cacheKey, $html, 3600);
        }
        SystemProfiler::lap('Response ready');
        $this->logger->debug(sprintf("SITE PROFILER %s Finished in %.3f ms", SystemProfiler::getName(), SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
        return $response;
    }

    protected function getReactPluginModuleHtml(): string
    {
        if ($this->systemConfig->general->devMode) {
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

    /**
     * Returns the HTML for the Vite imports for the given entry points.
     * The first element in the return array is the HTML for JS imports,
     * the second element is the HTML for CSS imports.
     * @param array $viteEntryPoints
     * @return string[]
     */
    protected function getViteImportHtml(array $viteEntryPoints): array
    {
        $viteJsImportsHtml = '';
        $viteCssImportsHtml = '';
        if ($this->systemConfig->general->devMode) {
            $viteJsImportsHtml = sprintf(
                "<script type=\"module\" src=\"%s/@vite/client\"></script>\n",
                self::VITE_DEV_BASE
            );
            foreach ($viteEntryPoints as $viteEntryPoint) {
                $viteJsImportsHtml .= sprintf(
                    "<script type=\"module\" src=\"%s/$viteEntryPoint\"></script>\n",
                    self::VITE_DEV_BASE
                );
            }
        } else {
            $baseUrl = $this->getBaseUrl();
            $viteJsImports = [];
            $viteCssImports = [];

            foreach ($viteEntryPoints as $entryPoint) {
                $viteImports = $this->getViteImportsFromManifest($entryPoint);
                $viteJsImports = [...$viteJsImports, ...$viteImports['js']];
                $viteCssImports = [...$viteCssImports, ...$viteImports['css']];
            }
            foreach ($viteJsImports as $import) {
                $viteJsImportsHtml .= <<<END
    <script type="module" src="$baseUrl/dist/$import"></script>
END;
            }
            foreach ($viteCssImports as $import) {
                $viteCssImportsHtml .= <<<END
     <link rel="stylesheet" type="text/css" href="$baseUrl/dist/$import">
END;
            }
        }
        return [$viteJsImportsHtml, $viteCssImportsHtml];
    }

    /**
     * @param string $entryPoint
     * @return array
     */
    protected function getViteImportsFromManifest(string $entryPoint): array
    {
        $manifestFileName = './dist/.vite/manifest.json';
        $manifestFileContents = file_get_contents($manifestFileName);
        if ($manifestFileContents === false) {
            $this->logger->error("Vite manifest file not found: $manifestFileName");
            return [];
        }
        $manifest = json_decode($manifestFileContents, true);
//        $this->logger->debug("Vite manifest: ", [ 'entryPoints' => array_keys($manifest)]);
        if (!isset($manifest[$entryPoint])) {
            $this->logger->error("Page '$entryPoint' not found in Vite manifest");
            return [];
        }

        $jsImports = [];
        $cssImports = [];

        $jsImports[] = $manifest[$entryPoint]["file"];
        foreach ($manifest[$entryPoint]["imports"] as $import) {
            if (!isset($manifest[$import])) {
                $this->logger->error("Import $import not found in Vite manifest");
                continue;
            }
            $jsImports[] = $manifest[$import]["file"];
            $importCss = $this->getCssImportsFromEntry($import, $manifest);
            if (count($importCss) > 0) {
//                $this->logger->debug("Adding $import CSS imports: ", $importCss);
                array_push($cssImports, ...$importCss);
            }
        }

        $mainCssImports = $this->getCssImportsFromEntry($entryPoint, $manifest);
//        $this->logger->debug("Main CSS imports: ", $mainCssImports);
//        $this->logger->debug("All CSS imports: ", $cssImports);

        array_push($cssImports, ...$mainCssImports);

        return ['js' => $jsImports, 'css' => $cssImports];
    }

    private function getCssImportsFromEntry(string $entryPoint, array $manifest): array
    {
        $cssImports = [];

        if (isset($manifest[$entryPoint]["css"])) {
            foreach ($manifest[$entryPoint]["css"] as $css) {
                $cssImports[] = $css;
            }
        }
        if (isset($manifest[$entryPoint]["cssModules"])) {
            foreach ($manifest[$entryPoint]["cssModules"] as $cssModule) {
                $cssImports[] = $cssModule;
            }
        }
        return $cssImports;
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
        return BaseUrlDetector::detectBaseUrl($this->systemConfig->general->subDir);
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
            $thePage['isTranscribed'] = in_array($page['page_number'], $transcribedPages);
            $thePages[] = $thePage;
        }
        return $thePages;
    }

}
