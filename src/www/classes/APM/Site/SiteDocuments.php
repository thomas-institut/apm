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
 * Site Documents class
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\Transcription\ApmChunkSegmentLocation;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;

/**
 * SiteDocuments class
 *
 */
class SiteDocuments extends SiteController
{

    const DOCUMENT_DATA_CACHE_KEY = 'SiteDocuments-DocumentData';
    const DOCUMENT_DATA_TTL = 8 * 24 * 3600;

    const TEMPLATE_DOCS_PAGE = 'documents-page.twig';
    const TEMPLATE_SHOW_DOCS_PAGE = 'doc-details.twig';
    const TEMPLATE_DEFINE_DOC_PAGES = 'doc-def-pages.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function documentsPage(Request $request, Response $response): Response
    {
        SystemProfiler::setName("Site:" . __FUNCTION__);
        $this->profiler->start();

        $cache = $this->systemManager->getSystemDataCache();
        try {
            $data = unserialize($cache->get(self::DOCUMENT_DATA_CACHE_KEY));
        } catch (KeyNotInCacheException $e) {
            // not in cache
            $this->logger->debug("Cache miss for SiteDocuments document data");
            $dataManager = $this->systemManager->getDataManager();
            $data = self::buildDocumentData($this->systemManager);
            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, serialize($data));
        }
        $docs = $data['docs'];

        $canManageDocuments = false;
        $userManager = $this->systemManager->getUserManager();
        try {
            if ($userManager->hasTag($this->userId, UserTag::CREATE_DOCUMENTS) || $userManager->isRoot($this->userId)) {
                $canManageDocuments = true;
            }
        } catch (UserNotFoundException) {
            // should never happen though
        }

        $this->profiler->stop();
        $this->logProfilerData('documentsPage');

        return $this->renderPage($response, self::TEMPLATE_DOCS_PAGE, [
            'docs' => $docs,
            'canManageDocuments' => $canManageDocuments ? '1' : '0'
        ]);
    }

    static public function buildDocumentData(SystemManager $systemManager): array
    {
        $docs = [];

        $docIds = $systemManager->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);
        $docManager = $systemManager->getDocumentManager();
        $dataManager = $systemManager->getDataManager();

        foreach ($docIds as $docId){
            $doc = [];

            try {
                $legacyDocId = $docManager->getLegacyDocId($docId);
                $doc['numPages'] = $docManager->getDocPageCount($docId);
                $transcribedPages = $dataManager->getTranscribedPageListByDocId($legacyDocId);
                $doc['numTranscribedPages'] = count($transcribedPages);
                $doc['transcribers'] = $dataManager->getEditorTidsByDocId($legacyDocId);
                $doc['docInfo'] = $docManager->getLegacyDocInfo($docId);

            } catch (DocumentNotFoundException $e) {
                // should never happen
                $systemManager->getLogger()->error("Document not found: " . $e->getMessage());
                continue;
            }
            $docs[] = $doc;
        }

        return [ 'docs' => $docs];
    }


    public static function updateDataCache(SystemManager $systemManager): bool
    {
        try {
            $data = self::buildDocumentData($systemManager);
        } catch(Exception $e) {
            $systemManager->getLogger()->error("Exception while building DocumentData",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        $systemManager->getSystemDataCache()->set(self::DOCUMENT_DATA_CACHE_KEY, serialize($data));
        return true;
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     * @throws PersonNotFoundException
     * @throws UserNotFoundException
     */
    public function showDocPage(Request $request, Response $response, array $args): Response
    {
        
        $id = $args['id'];

        $selectedPage = intval($request->getQueryParams()['selectedPage'] ?? '0');

        $docId = $this->systemManager->getEntitySystem()->getEntityIdFromString($id);

        if ($docId === -1) {
            return $this->getBasicErrorPage($response, "Invalid Document ID",
                "Invalid Document ID $id", HttpStatus::BAD_REQUEST);
        }

        $this->logger->debug("Showing Document Page for Document ID $docId");


        $chunkSegmentErrorMessages = [];
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::VALID] = '';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::NO_CHUNK_START] = 'No chunk start found';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::NO_CHUNK_END] = 'No chunk end found';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::CHUNK_START_AFTER_END] = 'Chunk start after chunk end';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::DUPLICATE_CHUNK_START_MARKS] = 'Duplicate start marks';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::DUPLICATE_CHUNK_END_MARKS] = 'Duplicate end marks';


        $this->profiler->start();
        $dataManager = $this->systemManager->getDataManager();
        $docManager = $this->systemManager->getDocumentManager();
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $userManager = $this->systemManager->getUserManager();
        if ($docId < 2000) {
            // a legacy doc id
            $this->logger->debug("Id $docId is a legacy id");
            try {
                $docData = $docManager->getDocumentEntityData($docId);
            } catch (DocumentNotFoundException $e) {
                $this->logger->debug("Document not found: " . $e->getMessage());
                return $this->getBasicErrorPage($response, "Document $id not found",
                    "Document $id not found", HttpStatus::NOT_FOUND);
            }
            $this->logger->debug("Entity id for legacy doc id $docId is $docData->id");
            $newUrl = $this->router->urlFor("doc.details", [ 'id' => Tid::toBase36String($docData->id)]);
            $this->logger->warning("Redirecting to $newUrl");
            return $response->withHeader('Location', $newUrl)->withStatus(HttpStatus::MOVED_PERMANENTLY);
        }

        $doc = [];
        try {
            $legacyDocId = $docManager->getLegacyDocId($docId);
            $doc['numPages'] = $docManager->getDocPageCount($docId);
            $pageInfoArray = $docManager->getLegacyDocPageInfoArray($docId);
            $doc['docInfo'] = $docManager->getLegacyDocInfo($docId);
        } catch (DocumentNotFoundException $e) {
            return $this->getBasicErrorPage($response, "Document $id not found",
                "Document $id not found", HttpStatus::NOT_FOUND);
        }


        $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($legacyDocId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $editorTids = $dataManager->getEditorTidsByDocId($legacyDocId);
        $doc['editors'] = $editorTids;
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArrayNew($pageInfoArray, $transcribedPages, $doc['docInfo']);


        // TODO: enable metadata when there's a use for it, or when the doc details JS app
        //  would not hang if there's an error with it.
        $metaData = [];

        $chunkLocationMap = $transcriptionManager->getChunkLocationMapForDoc($legacyDocId, '');

        $versionMap = $transcriptionManager->getVersionsForChunkLocationMap($chunkLocationMap);
        $lastChunkVersions = $transcriptionManager->getLastChunkVersionFromVersionMap($versionMap);
        $lastSaves = $transcriptionManager->getLastSavesForDoc($legacyDocId, 20);
        $chunkInfo = [];

        $lastVersions = [];
        $authorInfo = [];

        foreach($lastSaves as $saveVersionInfo) {
            if (!isset($authorInfo[$saveVersionInfo->authorTid])) {
                $authorInfo[$saveVersionInfo->authorTid] =
                    $this->systemManager->getPersonManager()->getPersonEssentialData($saveVersionInfo->authorTid);
            }
        }

        // TODO: support different local Ids in chunk list
        foreach($chunkLocationMap as $workId => $chunkArray) {
            foreach ($chunkArray as $chunkNumber => $docArray) {
                foreach($docArray as $docIdInMap => $witnessLocalIdArray) {
                    foreach($witnessLocalIdArray as $witnessLocalId => $segmentArray) {
                        $lastChunkVersion = $lastChunkVersions[$workId][$chunkNumber][$docIdInMap][$witnessLocalId];
                        $lastVersions[$workId][$chunkNumber] = $lastChunkVersion;
                        if ($lastChunkVersion->authorTid !== 0 && !isset($authorInfo[$lastChunkVersion->authorTid])) {
                            $authorInfo[$lastChunkVersion->authorTid] = $this->systemManager->getPersonManager()->getPersonEssentialData($lastChunkVersion->authorTid);
                        }
                        foreach ($segmentArray as $segmentNumber => $location) {
                            /** @var $location ApmChunkSegmentLocation */
                            if ($location->start->isZero()) {
                                $start = '';
                            } else {
                                try {
                                    $pageInfo = $docManager->getPageInfo($docManager->getPageIdByDocSeq($docId, $location->start->pageSequence));
                                } catch (DocumentNotFoundException|PageNotFoundException $e) {
                                    // should never happen
                                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                                }
                                $start = [
                                    'seq' => $location->start->pageSequence,
                                    'foliation' => $pageInfo->foliation,
                                    'column' => $location->start->columnNumber,
                                    'numColumns' => $pageInfo->numCols
                                ];
                            }
                            if ($location->end->isZero()) {
                                $end = '';
                            } else {
                                try {
                                    $pageInfo = $docManager->getPageInfo($docManager->getPageIdByDocSeq($docId, $location->end->pageSequence));
                                } catch (DocumentNotFoundException|PageNotFoundException $e) {
                                    // should never happen
                                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                                }
                                $end = [
                                    'seq' => $location->end->pageSequence,
                                    'foliation' => $pageInfo->foliation,
                                    'column' => $location->end->columnNumber,
                                    'numColumns' => $pageInfo->numCols
                                ];
                            }

                            $chunkInfo[$workId][$chunkNumber][$segmentNumber] =
                                [
                                    'start' => $start,
                                    'end' => $end,
                                    'valid' => $location->isValid(),
                                    'errorCode' => $location->getChunkError(),
                                    'errorMsg' => $chunkSegmentErrorMessages[$location->getChunkError()]
                                ];
                        }
                    }
                }

            }

        }

        $this->profiler->stop();
        $this->logProfilerData('showDocPage-' . $docId);

        return $this->renderPage($response, self::TEMPLATE_SHOW_DOCS_PAGE, [
            'navByPage' => false,
            'canDefinePages' => true,
            'canEditDocuments' => $userManager->isUserAllowedTo($this->userId, UserTag::EDIT_DOCUMENTS),
            'doc' => $doc,
            'chunkInfo' => $chunkInfo,
            'lastVersions' => $lastVersions,
            'lastSaves' => $lastSaves,
            'metaData' => $metaData,
            'userTid' => $this->userId,
            'params' => explode('/', $args['params'] ?? ''),
            'selectedPage' => $selectedPage
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function defineDocPages(Request $request, Response $response): Response
    {
        $this->profiler->start();


        $docId = $request->getAttribute('id');
        $docManager = $this->systemManager->getDocumentManager();
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $doc = [];
        try {
            $doc['numPages'] = $docManager->getDocPageCount($docId);
            $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($docId);
            $pageInfoArray = $docManager->getLegacyDocPageInfoArray($docId);
            $doc['docInfo'] = $docManager->getLegacyDocInfo($docId);
            $doc['numTranscribedPages'] = count($transcribedPages);
            $doc['tableId'] = "doc-$docId-table";
            $doc['pages'] = $this->buildPageArrayNew($pageInfoArray,
                $transcribedPages, $doc['docInfo']);
        } catch (DocumentNotFoundException $e) {
            $this->logger->info($e->getMessage());
            return $this->getBasicErrorPage($response, "Not found", "Document not found", HttpStatus::NOT_FOUND);
        }
        $this->profiler->stop();
        $this->logProfilerData('defineDocPages-' . $docId);
        return $this->renderPage($response, self::TEMPLATE_DEFINE_DOC_PAGES, [
            'doc' => $doc
        ]);
    }
}
