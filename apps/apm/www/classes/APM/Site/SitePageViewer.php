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

use APM\System\ApmImageType;
use APM\System\Document\DocumentManager;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\SystemManager;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Work\WorkManager;
use APM\System\Work\WorkNotFoundException;
use APM\ToolBox\HttpStatus;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use RuntimeException;
use Slim\Views\Twig;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\Profiler\SystemProfiler;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

/**
 * Site Controller class
 *
 */
class SitePageViewer extends SiteController
{

    const string PAGE_VIEWER_TWIG = 'page-viewer.twig';


    /**
     * Returns an array of active work data with the same format as the
     * legacy DataManager getActiveWorks
     *
     * @return string[]
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getActiveWorks() : array {
        /** @var WorkManager $workManager */
        $workManager = $this->container->get(WorkManager::class);
       $enabledWorks = $workManager->getEnabledWorks();
//       $this->logger->debug("EnabledWorks: ".count($enabledWorks), [ $enabledWorks]);

       $activeWorks = [];
       foreach ($enabledWorks as $work) {
           try {
               $workData = $workManager->getWorkData($work);
           } catch (WorkNotFoundException $e) {
               // should never happen
               throw new RuntimeException($e->getMessage());
           }
           $activeWorks[] = [
               'title' => '(' . $workData->workId . ') ' . $workData->shortTitle,
               'dareId' => $workData->workId,
               'maxChunk' => 500
           ];
       }
       return $activeWorks;
    }


    /**
     * @param Request $request
     * @param Response $response
     * @param bool $byPage
     * @return Response
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    function pageViewerPageByDoc(Request $request, Response $response, bool $byPage): Response
    {
        $givenDocId = $request->getAttribute('doc') ?? '';
        $docId = Tid::fromString($givenDocId);
        if ($docId === -1) {
            return $this->getErrorPage($response, 'Error', "Invalid doc id '$givenDocId'",
                HttpStatus::BAD_REQUEST);
        }
        $givenN = $request->getAttribute('n') ?? '';
        $n = intval($givenN);
        $inputNumberType = $byPage ? 'page' : 'seq';
        if ($n <= 0) {
            return $this->getErrorPage($response, 'Error', "Invalid $inputNumberType '$givenN'",
                HttpStatus::BAD_REQUEST);
        }

        $activeColumn = intval($request->getAttribute('col') ?? '');
        if ($activeColumn === 0) {
            $activeColumn = 1;
        }
        /** @var DocumentManager $docManager */
        $docManager = $this->container->get(DocumentManager::class);
        /** @var TranscriptionManager $txManager */
        $txManager = $this->container->get(TranscriptionManager::class);

        /** @var SystemManager $systemManager */
        $systemManager = $this->container->get(SystemManager::class);

        try {
            $docInfo = $docManager->getLegacyDocInfo($docId);
            if ($byPage) {
                $pageId = $docManager->getPageIdByDocPage($docId, $n);
            } else {
                $pageId = $docManager->getPageIdByDocSeq($docId, $n);
            }
            $pageInfo = $docManager->getLegacyPageInfo($pageId);
            $pageNumber = $pageInfo['page_number'];
            $seq = $pageInfo['seq'];
            $docPageCount = $docManager->getDocPageCount($docId);
            $legacyPageInfoArray = $docManager->getLegacyDocPageInfoArray($docId, DocumentManager::ORDER_BY_SEQ);
            $transcribedPages = $txManager->getTranscribedPageListByDocId($docId);
            $imageSources = $systemManager->getImageSources();
            $imageUrl = $docManager->getImageUrl($docId, $pageInfo['img_number'], ApmImageType::IMAGE_TYPE_DEFAULT, $imageSources);
            $deepZoom = $docManager->isDocDeepZoom($docId) ? '1' : '0';
            $activeWorks = $this->getActiveWorks();
            $thePages = $this->buildPageArray($legacyPageInfoArray, $transcribedPages);
            $languagesArray = $this->getLanguages();

            $pageNumberFoliation = $pageInfo['seq'];
            if ($pageInfo['foliation'] !== NULL) {
                $pageNumberFoliation = $pageInfo['foliation'];
            }
        } catch (DocumentNotFoundException) {
            $this->logger->info("Document '$givenDocId' (= $docId) not found");
            return $this->getErrorPage($response, 'Error', "Document $givenDocId not found",
                HttpStatus::NOT_FOUND);
        } catch (PageNotFoundException) {
            $this->logger->info("Page $docId:$n not found");
            return $this->getErrorPage($response, 'Error', "Page $givenDocId:$n not found",
                HttpStatus::NOT_FOUND);
        }

        [$viteJsImportsHtml, $viteCssImportsHtml] = $this->getViteImportHtml([ 'js/pages/PageViewer/PageViewer.js']);
        $legacyPrefix  = $this->systemConfig->general->devMode ? 'public' : 'dist';

        return $this->renderLegacyPage($response, self::PAGE_VIEWER_TWIG, [
            'navByPage' => $byPage,  // i.e., navigate by sequence
            'doc' => $docId,
            'docIdString' => Tid::toBase36String($docId),
            'docInfo' => $docInfo,
            'docPageCount' => $docPageCount,
            'page' => $pageNumber,
            'seq' => $seq,
            'activeColumn' => $activeColumn,
            'pageNumberFoliation' => $pageNumberFoliation,
            'pageInfo' => $pageInfo,
            'activeWorks' => $activeWorks,
            'thePages' => $thePages,
            'imageUrl' => $imageUrl,
            'languagesArray' => $languagesArray,
            'deepZoom' => $deepZoom,
            'viteJsImportsHtml' => $viteJsImportsHtml,
            'viteCssImportsHtml' => $viteCssImportsHtml,
            'legacyPrefix' => $legacyPrefix,
        ]);
    }


    /**
     * @param ResponseInterface $response
     * @param string $template
     * @param array $data
     * @return ResponseInterface
     */
    protected function renderLegacyPage(ResponseInterface $response,
                                        string            $template, array $data): ResponseInterface
    {

        $data['commonData'] = $this->getCommonData();
        $data['baseUrl'] = $this->getBaseUrl();
        try {
            $responseToReturn = $this->getTwig()->render($response, $template, $data);
            SystemProfiler::lap('Response ready');
            $this->logger->info("SITE PROFILER " . SystemProfiler::getName(), SystemProfiler::getLaps());
            return $responseToReturn;
        } catch (LoaderError|RuntimeError|SyntaxError $e) {
            $this->logger->error("Twig error rendering page: " . $e->getMessage(), ['exception' => get_class($e)]);
            return $this->getSystemErrorPage($response, "Error rendering page", []);
        }
    }

    private function getTwig(): Twig
    {
        try {
            return $this->container->get(Twig::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            throw new RuntimeException("Twig not found in container");
        }
    }

}
