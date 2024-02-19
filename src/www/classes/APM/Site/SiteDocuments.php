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

use APM\FullTranscription\ApmChunkSegmentLocation;
use APM\System\DataRetrieveHelper;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use AverroesProject\Data\DataManager;
use Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;

/**
 * SiteDocuments class
 *
 */
class SiteDocuments extends SiteController
{

    const DOCUMENT_DATA_CACHE_KEY = 'SiteDocuments-DocumentData';

    const TEMPLATE_DOCS_PAGE = 'documents-page.twig';
    const TEMPLATE_SHOW_DOCS_PAGE = 'doc-details.twig';
    const TEMPLATE_DOC_EDIT_PAGE = 'doc-edit.twig';
    const TEMPLATE_NEW_DOC_PAGE = 'doc-new.twig';
    const TEMPLATE_DEFINE_DOC_PAGES = 'doc-def-pages.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws PersonNotFoundException
     */
    public function documentsPage(Request $request, Response $response): Response
    {

        $dataManager = $this->dataManager;
        $this->profiler->start();

        $cache = $this->systemManager->getSystemDataCache();
        try {
            $data = unserialize($cache->get(self::DOCUMENT_DATA_CACHE_KEY));
        } catch (KeyNotInCacheException $e) {
            // not in cache
            $this->logger->debug("Cache miss for SiteDocuments document data");
            $data = self::buildDocumentData($dataManager, $this->systemManager->getPersonManager());
            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, serialize($data));
        }
        $docs = $data['docs'];
        $peopleInfo = $data['peopleInfo'];

        $canManageDocuments = false;
        $userManager = $this->systemManager->getUserManager();
        try {
            if ($userManager->hasTag($this->userTid, UserTag::CREATE_DOCUMENTS) || $userManager->isRoot($this->userTid)) {
                $canManageDocuments = true;
            }
        } catch (UserNotFoundException) {
            // should never happen though
        }

        $this->profiler->stop();
        $this->logProfilerData('documentsPage');

        return $this->renderPage($response, self::TEMPLATE_DOCS_PAGE, [
            'docs' => $docs,
            'peopleInfo' => $peopleInfo,
            'canManageDocuments' => $canManageDocuments ? '1' : '0'
        ]);
    }

    /**
     * @throws PersonNotFoundException
     */
    static public function buildDocumentData(DataManager $dataManager, PersonManagerInterface $personManager): array
    {
        $docs = [];
        $usersMentioned = [];

        $docIds = $dataManager->getDocIdList('title');
        foreach ($docIds as $docId){
            //$profiler->lap("Doc $docId - START");
            $doc = array();
            $doc['numPages'] = $dataManager->getPageCountByDocId($docId);
            $transcribedPages = $dataManager->getTranscribedPageListByDocId($docId);
            $doc['numTranscribedPages'] = count($transcribedPages);
            $editorTids = $dataManager->getEditorTidsByDocId($docId);
            $doc['editors'] = [];
            foreach ($editorTids as $editorTid){
                $usersMentioned[] = $editorTid;
                $doc['editors'][] =
                    $personManager->getPersonEssentialData($editorTid);
            }
            $doc['docInfo'] = $dataManager->getDocById($docId);
            $docs[] = $doc;
        }

        $helper = new DataRetrieveHelper();
        $peopleInfoArray = $helper->getAuthorInfoArrayFromList($usersMentioned, $personManager);
        return [ 'docs' => $docs, 'peopleInfo' => $peopleInfoArray];
    }


    public static function updateDataCache(SystemManager $systemManager): bool
    {
        try {
            $data = self::buildDocumentData($systemManager->getDataManager(), $systemManager->getPersonManager());
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
     * @return Response
     * @throws PersonNotFoundException
     * @throws UserNotFoundException
     */
    public function showDocPage(Request $request, Response $response): Response
    {
        
        $docId = $request->getAttribute('id');

        $chunkSegmentErrorMessages = [];
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::VALID] = '';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::NO_CHUNK_START] = 'No chunk start found';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::NO_CHUNK_END] = 'No chunk end found';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::CHUNK_START_AFTER_END] = 'Chunk start after chunk end';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::DUPLICATE_CHUNK_START_MARKS] = 'Duplicate start marks';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::DUPLICATE_CHUNK_END_MARKS] = 'Duplicate end marks';


        $this->profiler->start();
        $dataManager = $this->dataManager;
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $pageManager = $transcriptionManager->getPageManager();
        $userManager = $this->systemManager->getUserManager();

        $doc = [];
        $doc['numPages'] = $dataManager->getPageCountByDocId($docId);
        $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($docId);
        $pageInfoArray = $pageManager->getPageInfoArrayForDoc($docId);

        $doc['numTranscribedPages'] = count($transcribedPages);
        $editorTids = $dataManager->getEditorTidsByDocId($docId);
        $doc['editors'] = [];
        foreach ($editorTids as $editorTid){
            $doc['editors'][] = $this->systemManager->getPersonManager()->getPersonEssentialData($editorTid);
        }
        $doc['docInfo'] = $dataManager->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArrayNew($pageInfoArray, $transcribedPages, $doc['docInfo']);


        // TODO: enable metadata when there's a use for it, or when the doc details JS app
        //  would not hang if there's an error with it.
        $metaData = [];

        $chunkLocationMap = $transcriptionManager->getChunkLocationMapForDoc($docId, '');

        $versionMap = $transcriptionManager->getVersionsForChunkLocationMap($chunkLocationMap);
        $lastChunkVersions = $transcriptionManager->getLastChunkVersionFromVersionMap($versionMap);
        $lastSaves = $transcriptionManager->getLastSavesForDoc($docId, 20);
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
                                $pageInfo = $transcriptionManager->getPageInfoByDocSeq($docId, $location->start->pageSequence);
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
                                $pageInfo = $transcriptionManager->getPageInfoByDocSeq($docId, $location->end->pageSequence);
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


        $pageTypeNames  = $this->dataManager->getPageTypeNames();

        $this->profiler->stop();
        $this->logProfilerData('showDocPage-' . $docId);

        return $this->renderPage($response, self::TEMPLATE_SHOW_DOCS_PAGE, [
            'navByPage' => false,
            'canDefinePages' => true,
            'canEditDocuments' => $userManager->isUserAllowedTo($this->userTid, UserTag::EDIT_DOCUMENTS),
            'pageTypeNames' => $pageTypeNames,
            'doc' => $doc,
            'chunkInfo' => $chunkInfo,
            'lastVersions' => $lastVersions,
            'lastSaves' => $lastSaves,
            'metaData' => $metaData,
            'userTid' => $this->userTid,
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function newDocPage(Request $request, Response $response): Response
    {

        if (!$this->systemManager->getUserManager()->isUserAllowedTo($this->userTid, 'create-new-documents')) {
            $this->logger->debug("User $this->userTid tried to add new doc but is not allowed to do it");
            return $this->getErrorPage($response, 'Error', 'You are not allowed to create documents', HttpStatus::UNAUTHORIZED);
        }

        return $this->renderPage($response, self::TEMPLATE_NEW_DOC_PAGE, [
            'imageSources' =>  $this->systemManager->getAvailableImageSources(),
            'languages' => $this->getLanguages(),
            'docTypes' =>  [ ['mss', 'Manuscript'], ['print', 'Print']]
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function editDocPage(Request $request, Response $response): Response
    {
        $this->profiler->start();

        $docId = $request->getAttribute('id');
        $dataManager = $this->dataManager;
        $docInfo = $dataManager->getDocById($docId);
        if ($docInfo === false) {
            return $this->getBasicErrorPage($response, 'Not found', "Document not found", HttpStatus::NOT_FOUND);
        }
        $availableImageSources = $this->systemManager->getAvailableImageSources();
        $docTypes = [ ['mss', 'Manuscript'], ['print', 'Print']];
        $canBeDeleted = $dataManager->getPageCountByDocIdAllTime($docId) === 0;
        $this->profiler->stop();
        $this->logProfilerData('editDocPage-' . $docId);
        return $this->renderPage($response, self::TEMPLATE_DOC_EDIT_PAGE, [
            'docInfo' => $docInfo,
            'imageSources' => $availableImageSources,
            'languages' => $this->getLanguages(),
            'docTypes' => $docTypes,
            'canBeDeleted' => $canBeDeleted
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
        
//        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'define-doc-pages')){
//            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to define document pages  but is not allowed to do it');
//            return $this->renderPage($response, self::TEMPLATE_ERROR_NOT_ALLOWED, [
//                'message' => 'You are not authorized to edit document settings'
//            ]);
//        }
        
        $docId = $request->getAttribute('id');
        $db = $this->dataManager;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $transcribedPages = $db->getTranscribedPageListByDocId($docId);
        $db->getDocPageInfo($docId);
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $pageManager = $transcriptionManager->getPageManager();
        $pageInfoArray = $pageManager->getPageInfoArrayForDoc($docId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $doc['docInfo'] = $db->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArrayNew($pageInfoArray,
                $transcribedPages, $doc['docInfo']);

        $this->profiler->stop();
        $this->logProfilerData('defineDocPages-' . $docId);
        return $this->renderPage($response, self::TEMPLATE_DEFINE_DOC_PAGES, [
            'doc' => $doc
        ]);
    }
}
