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
use APM\System\Transcription\ChunkSegmentLocationStatus;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;

/**
 * SiteDocuments class
 *
 */
class SiteDocuments extends SiteController
{

    const string DOCUMENT_DATA_CACHE_KEY = 'SiteDocuments-DocumentData';
    const int DOCUMENT_DATA_TTL = 8 * 24 * 3600;

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function documentsPage(Request $request, Response $response): Response
    {
        SystemProfiler::setName("Site:" . __FUNCTION__);
        

//        $cache = $this->systemManager->getSystemDataCache();
//        try {
//            $data = json_decode($cache->get(self::DOCUMENT_DATA_CACHE_KEY), true);
//        } catch (ItemNotInCacheException) {
//            // not in cache
//            $this->logger->debug("Cache miss for SiteDocuments document data");
//            $data = self::buildDocumentData($this->systemManager);
//            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, json_encode($data));
//        }
//        $docs = $data['docs'];

        $docs = self::getAllDocumentsData($this->systemManager, $this->userId);

        $canManageDocuments = false;
        $userManager = $this->systemManager->getUserManager();
        try {
            if ($userManager->hasTag($this->userId, UserTag::CREATE_DOCUMENTS) || $userManager->isRoot($this->userId)) {
                $canManageDocuments = true;
            }
        } catch (UserNotFoundException) {
            // should never happen though
        }

        return $this->renderStandardPage(
            $response,
            '',
            'Documents',
            'DocumentsPage',
            'js/pages/DocumentsPage.ts',
            [
                'docs' => $docs,
                'canManageDocuments' => $canManageDocuments
            ],
            [],
            [
                '../node_modules/datatables.net-dt/css/jquery.dataTables.min.css',
                'documents_page.css'
            ]
        );
    }

    public static function getAllDocumentsData(SystemManager $systemManager, int $userId): array {
        $cache = $systemManager->getSystemDataCache();
        try {
            $data = json_decode($cache->get(self::DOCUMENT_DATA_CACHE_KEY), true);
        } catch (ItemNotInCacheException) {
            // not in cache
            $systemManager->getLogger()->debug("Cache miss for SiteDocuments document data");
            $data = self::buildDocumentData($systemManager);
            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, json_encode($data));
        }
        $docs = $data['docs'];
        $visibleDocIds = self::getVisibleDocumentIdsForUser($systemManager, $userId);
        if ($visibleDocIds === null) {
            return $docs;
        }
        return self::filterDocumentDataByIds($docs, $visibleDocIds);
    }

    /**
     * @throws DocumentNotFoundException
     */
    static private function getDocData(SystemManager $systemManager, int $docId) : array {
        $docManager = $systemManager->getDocumentManager();
        $txManager = $systemManager->getTranscriptionManager();
        $legacyDocId = $docManager->getLegacyDocId($docId);
        $doc = [];
        $doc['numPages'] = $docManager->getDocPageCount($docId);
        $transcribedPages = $txManager->getTranscribedPageListByDocId($legacyDocId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $doc['transcribers'] = $txManager->getEditorIdsByDocId($legacyDocId);
        $doc['docInfo'] = $docManager->getLegacyDocInfo($docId);
        $doc['id'] = $docId;
        return $doc;
    }

    private static function getVisibleDocumentIdsForUser(SystemManager $systemManager, int $userId): ?array
    {
        $userManager = $systemManager->getUserManager();
        try {
            if ($userManager->isRoot($userId) || $userManager->hasTag($userId, UserTag::MANAGE_USERS)) {
                return null;
            }
        } catch (UserNotFoundException) {
            return [];
        }
        return $systemManager->getScopeManager()->getDocumentIdsForUser($userId);
    }

    private static function filterDocumentDataByIds(array $docs, array $docIds): array
    {
        if (count($docIds) === 0) {
            return [];
        }
        $allowed = array_fill_keys(array_map('strval', $docIds), true);
        $filtered = array_filter($docs, function (array $doc) use ($allowed) {
            return isset($allowed[(string) $doc['id']]);
        });
        return array_values($filtered);
    }

    static public function buildDocumentData(SystemManager $systemManager): array
    {
        $docs = [];

        $docIds = $systemManager->getEntitySystem()->getAllEntitiesForType(Entity::tDocument);

        foreach ($docIds as $docId){
            try {
               $docs[] = self::getDocData($systemManager, $docId);
            } catch (DocumentNotFoundException $e) {
                // should never happen
                $systemManager->getLogger()->error("Document not found: " . $e->getMessage());
                continue;
            }
        }

        return [ 'docs' => $docs];
    }


    public static function updateDataCache(SystemManager $systemManager, array $docIds) : bool
    {
//        $systemManager->getLogger()->info("Updating data cache",  ['docIds' => $docIds]);
        $data = [];
        $completeRebuild = false;
        if (count($docIds) !== 0) {
            try {
                $data = json_decode($systemManager->getSystemDataCache()->get(self::DOCUMENT_DATA_CACHE_KEY), true);
            } catch (ItemNotInCacheException) {
                $completeRebuild = true;
            }
        }
        if ($completeRebuild || count($docIds) === 0 ) {
            // redo the whole thing!
            $systemManager->getLogger()->info("Rebuilding document data cache entirely");
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
        }

        if (count($docIds) !== 0) {
            $updatedDocs = [];

            // updating existing docs
            foreach($data['docs'] as $docData) {
                if (in_array($docData['id'],  $docIds)) {
                    try {
                        $newDocData = self::getDocData($systemManager, $docData['id']);
                    } catch (DocumentNotFoundException) {
                        // a deleted document!
                        // nothing to do
                        continue;
                    }
                    $systemManager->getLogger()->info("Updating doc data for doc {$docData['id']}");
                    $updatedDocs[] = $newDocData;
                } else {
                    $updatedDocs[] = $docData;
                }
            }

            // adding new
            foreach($docIds as $docId) {
                if (!in_array($docId, array_column($updatedDocs, 'id'))) {
                    $systemManager->getLogger()->info("Adding doc data for new doc $docId");
                    try {
                        $newDocData = self::getDocData($systemManager, $docId);
                    } catch (DocumentNotFoundException) {
                        // a deleted document!
                        // nothing to do
                        continue;
                    }
                    $updatedDocs[] = $newDocData;
                }
            }
            $data['docs'] = $updatedDocs;
        }

        if (count($data) !== 0) {
            $systemManager->getSystemDataCache()->set(self::DOCUMENT_DATA_CACHE_KEY, json_encode($data));
        }

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
    public function documentPage(Request $request, Response $response, array $args): Response
    {
        
        $id = $args['id'];
        $selectedPage = intval($request->getQueryParams()['selectedPage'] ?? '0');
        $docId = $this->systemManager->getEntitySystem()->getEntityIdFromString($id);

        if ($docId === -1) {
            return $this->getBasicErrorPage($response, "Invalid Document ID",
                "Invalid Document ID $id", HttpStatus::BAD_REQUEST);
        }
        $docIdString = Tid::toBase36String($docId);

        $this->logger->debug("Showing Document Page for Document ID $docId ($docIdString)");

        $chunkSegmentErrorMessages = [];
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::VALID] = '';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::NO_CHUNK_START] = 'No chunk start found';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::NO_CHUNK_END] = 'No chunk end found';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::CHUNK_START_AFTER_END] = 'Chunk start after chunk end';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::DUPLICATE_CHUNK_START_MARKS] = 'Duplicate start marks';
        $chunkSegmentErrorMessages[ChunkSegmentLocationStatus::DUPLICATE_CHUNK_END_MARKS] = 'Duplicate end marks';


        
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
            $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($legacyDocId);
            $doc['numTranscribedPages'] = count($transcribedPages);
            $editorTids = $transcriptionManager->getEditorIdsByDocId($legacyDocId);
            $doc['editors'] = $editorTids;
            $doc['tableId'] = "doc-$docId-table";
            $doc['pages'] = $this->buildPageArrayNew($pageInfoArray, $transcribedPages, $doc['docInfo']);


            $chunkLocationMap = $transcriptionManager->getChunkLocationMapForDoc($legacyDocId, '');

            $versionMap = $transcriptionManager->getVersionsForChunkLocationMap($chunkLocationMap);
            $lastChunkVersions = $transcriptionManager->getLastChunkVersionFromVersionMap($versionMap);
            $lastSaves = $transcriptionManager->getLastSavesForDoc($legacyDocId, 20);

        } catch (DocumentNotFoundException) {
            return $this->getBasicErrorPage($response, "Document $id not found",
                "Document $id not found", HttpStatus::NOT_FOUND);
        }


        $chunkInfo = [];

        $versionInfo = [];
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
                        $versionInfo[$workId][$chunkNumber] = $lastChunkVersion;
                        if ($lastChunkVersion->authorTid !== 0 && !isset($authorInfo[$lastChunkVersion->authorTid])) {
                            $authorInfo[$lastChunkVersion->authorTid] = $this->systemManager->getPersonManager()->getPersonEssentialData($lastChunkVersion->authorTid);
                        }
                        foreach ($segmentArray as $segmentNumber => $location) {
                            /** @var $location ApmChunkSegmentLocation */
                            if ($location->getStart()->hasNotBeenSet()) {
                                $start = '';
                            } else {
                                try {
                                    $pageInfo = $docManager->getPageInfo($docManager->getPageIdByDocSeq($docId, $location->getStart()->pageSequence));
                                } catch (DocumentNotFoundException|PageNotFoundException $e) {
                                    // should never happen
                                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                                }
                                $start = [
                                    'seq' => $location->getStart()->pageSequence,
                                    'foliation' => $pageInfo->foliation,
                                    'column' => $location->getEnd()->columnNumber,
                                    'numColumns' => $pageInfo->numCols
                                ];
                            }
                            if ($location->getEnd()->hasNotBeenSet()) {
                                $end = '';
                            } else {
                                try {
                                    $pageInfo = $docManager->getPageInfo($docManager->getPageIdByDocSeq($docId, $location->getEnd()->pageSequence));
                                } catch (DocumentNotFoundException|PageNotFoundException $e) {
                                    // should never happen
                                    throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
                                }
                                $end = [
                                    'seq' => $location->getEnd()->pageSequence,
                                    'foliation' => $pageInfo->foliation,
                                    'column' => $location->getEnd()->columnNumber,
                                    'numColumns' => $pageInfo->numCols
                                ];
                            }

                            $chunkInfo[$workId][$chunkNumber][$segmentNumber] =
                                [
                                    'start' => $start,
                                    'end' => $end,
                                    'valid' => $location->isValid(),
                                    'errorCode' => $location->getStatus(),
                                    'errorMsg' => $chunkSegmentErrorMessages[$location->getStatus()]
                                ];
                        }
                    }
                }

            }

        }

        return $this->renderStandardPage(
            $response,
            '',
            "Doc " . $doc['docInfo'][' title'],
            "DocPage",
            'js/pages/DocPage.js',
            [
                'navByPage' => false,
                'canDefinePages' => true,
                'canEditDocuments' => $userManager->isUserAllowedTo($this->userId, UserTag::EDIT_DOCUMENTS),
                'doc' => $doc,
                'chunkInfo' => $chunkInfo,
                'versionInfo' => $versionInfo,
                'lastSaves' => $lastSaves,
                'metaData' => [],
                'userTid' => $this->userId,
                'params' => explode('/', $args['params'] ?? ''),
                'selectedPage' => $selectedPage
            ],
            [],
            [ 'doc_page.css'],
            [ "node_modules/openseadragon/build/openseadragon/openseadragon.js"]
        );
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function defineDocPages(Request $request, Response $response): Response
    {

        $docId = Tid::fromString($request->getAttribute('id'));

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

        return $this->renderStandardPage(
            $response,
            '',
            'Doc Def Pages',
            'DocDefPages',
            'js/pages/DocDefPages.js',
            [
                'doc' => $doc,
                'numPages' => $doc['numPages'],
            ],
            [],
            [ 'doc_page.css']
        );
    }
}
