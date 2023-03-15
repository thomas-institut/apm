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
use APM\System\SystemManager;
use AverroesProject\Data\DataManager;
use Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;

/**
 * SiteDocuments class
 *
 */
class SiteDocuments extends SiteController
{

    const DOCUMENT_DATA_CACHE_KEY = 'SiteDocuments-DocumentData';

    const TEMPLATE_DOCS_PAGE = 'documents.twig';
    const TEMPLATE_SHOW_DOCS_PAGE = 'doc-details.twig';
    const TEMPLATE_DOC_EDIT_PAGE = 'doc-edit.twig';
    const TEMPLATE_NEW_DOC_PAGE = 'doc-new.twig';
    const TEMPLATE_DEFINE_DOC_PAGES = 'doc-def-pages.twig';
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
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
            $data = self::buildDocumentData($dataManager);
            $cache->set(self::DOCUMENT_DATA_CACHE_KEY, serialize($data));
        }
        $docs = $data['docs'];
        $peopleInfo = $data['peopleInfo'];

        $canManageDocuments = false;
        if ($this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'docs-create-new')) {
            $canManageDocuments = true;
        }

        $this->profiler->stop();
        $this->logProfilerData('documentsPage');

        return $this->renderPage($response, self::TEMPLATE_DOCS_PAGE, [
            'docs' => $docs,
            'peopleInfo' => $peopleInfo,
            'canManageDocuments' => $canManageDocuments
        ]);
    }

    static public function buildDocumentData(DataManager $dataManager): array
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
            $editorsIds = $dataManager->getEditorsByDocId($docId);
            $doc['editors'] = [];
            foreach ($editorsIds as $edId){
                $usersMentioned[] = $edId;
                $doc['editors'][] =
                    $dataManager->userManager->getUserInfoByUserId($edId);
            }
            $doc['docInfo'] = $dataManager->getDocById($docId);
            $doc['tableId'] = "doc-$docId-table";
            $docs[] = $doc;
        }

        $helper = new DataRetrieveHelper();
        $peopleInfoArray = $helper->getAuthorInfoArrayFromList($usersMentioned, $dataManager->userManager);
        return [ 'docs' => $docs, 'peopleInfo' => $peopleInfoArray];
    }


    public static function updateDataCache(SystemManager $systemManager): bool
    {
        try {
            $data = self::buildDocumentData($systemManager->getDataManager());
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

//    public static function invalidateCache(DataCache $cache) {
//        try {
//            $cache->delete(self::DOCUMENT_DATA_CACHE_KEY);
//        } catch (KeyNotInCacheException $e) {
//            // no problem!!
//        }
//    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
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

        $doc = [];
        $doc['numPages'] = $dataManager->getPageCountByDocId($docId);
        $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($docId);
        $pageInfoArray = $pageManager->getPageInfoArrayForDoc($docId);

        $doc['numTranscribedPages'] = count($transcribedPages);
        $editorsIds = $dataManager->getEditorsByDocId($docId);
        $doc['editors'] = array();
        foreach ($editorsIds as $edId){
            array_push($doc['editors'], 
                    $this->dataManager->userManager->getUserInfoByUserId($edId));
        }
        $doc['docInfo'] = $dataManager->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArrayNew($pageInfoArray, $transcribedPages);
        
        $docInfoHtml = $this->hookManager->callHookedMethods('get-docinfo-html-' . $doc['docInfo']['image_source'],
                [ 'imageSourceData' => $doc['docInfo']['image_source_data']]);

        if (!is_string($docInfoHtml)) {
            $docInfoHtml = 'Image source not supported, please report to administrator.';
        }
        $doc['docInfoHtml'] = $docInfoHtml;


        // TODO: enable metadata when there's a use for it, or when the doc details JS app
        //  would not hang if there's an error with it.
        $metaData = [];

//        $metaData = $this->hookManager->callHookedMethods('get-doc-metadata-' . $doc['docInfo']['image_source'],
//            [ 'imageSourceData' => $doc['docInfo']['image_source_data']]);
//
//        if (!is_array($metaData)) {
//            $this->logger->debug('Invalid metadata returned for hook get-doc-metadata-' . $doc['docInfo']['image_source'],
//                [ 'returnedMetadata' =>$metaData]);
//            $metaData = [];
//        }



        $chunkLocationMap = $transcriptionManager->getChunkLocationMapForDoc($docId, '');

        $versionMap = $transcriptionManager->getVersionsForChunkLocationMap($chunkLocationMap);
        $lastChunkVersions = $transcriptionManager->getLastChunkVersionFromVersionMap($versionMap);
        $lastSaves = $transcriptionManager->getLastSavesForDoc($docId, 20);
        $chunkInfo = [];

        $lastVersions = [];
        $authorInfo = [];

        foreach($lastSaves as $saveVersionInfo) {
            if (!isset($authorInfo[$saveVersionInfo->authorId])) {
                $authorInfo[$saveVersionInfo->authorId] = $dataManager->userManager->getUserInfoByUserId($saveVersionInfo->authorId);
            }
        }

        // TODO: support different local Ids in chunk list
        foreach($chunkLocationMap as $workId => $chunkArray) {
            foreach ($chunkArray as $chunkNumber => $docArray) {
                foreach($docArray as $docIdInMap => $witnessLocalIdArray) {
                    foreach($witnessLocalIdArray as $witnessLocalId => $segmentArray) {
                        $lastChunkVersion = $lastChunkVersions[$workId][$chunkNumber][$docIdInMap][$witnessLocalId];
                        $lastVersions[$workId][$chunkNumber] = $lastChunkVersion;
                        if ($lastChunkVersion->authorId !== 0 && !isset($authorInfo[$lastChunkVersion->authorId])) {
                            $authorInfo[$lastChunkVersion->authorId] = $dataManager->userManager->getUserInfoByUserId($lastChunkVersion->authorId);
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

        $works = [];
        foreach(array_keys($chunkLocationMap) as $workId) {
            $works[$workId] = $dataManager->getWorkInfo($workId);
        }

        $canDefinePages = false;
        if ($this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'define-doc-pages')) {
            $canDefinePages = true;
        }


        $this->profiler->stop();
        $this->logProfilerData('showDocPage-' . $docId);

        return $this->renderPage($response, self::TEMPLATE_SHOW_DOCS_PAGE, [
            'navByPage' => false,
            'canDefinePages' => $canDefinePages,
            'doc' => $doc,
            'chunkInfo' => $chunkInfo,
            'works' => $works,
            'lastVersions' => $lastVersions,
            'authorInfo' => $authorInfo,
            'lastSaves' => $lastSaves,
            'metaData' => $metaData
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function newDocPage(Request $request, Response $response): Response
    {
     
        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'create-new-documents')){
            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to add new doc but is not allowed to do it');
            return $this->renderPage($response, self::TEMPLATE_ERROR_NOT_ALLOWED, [
                'message' => 'You are not authorized to add new documents in the system'
            ]);
        }

        $availableImageSources = $this->hookManager->callHookedMethods('get-image-sources', []);
        $imageSourceOptions = '';
        $docImageSourceIsImplemented = false;
        foreach($availableImageSources as $imageSource) {
            $imageSourceOptions .= '<option value="' . $imageSource . '"';
            $imageSourceOptions .= '>' . $imageSource . '</option>';
        }
        
        
        $languages = $this->languages;
        $langOptions = '';
        foreach($languages as $lang) {
            $langOptions .= '<option value="' . $lang['code'] . '"';
            $langOptions .= '>' . $lang['name'] . '</option>';
        }
        
        $docTypes = [ ['mss', 'Manuscript'], ['print', 'Print']];
        $docTypesOptions = '';
        foreach($docTypes as $type) {
            $docTypesOptions .= '<option value="' . $type[0] . '"';
            $docTypesOptions .= '>' . $type[1] . '</option>';
        }
        
        return $this->renderPage($response, self::TEMPLATE_NEW_DOC_PAGE, [
            'imageSourceOptions' => $imageSourceOptions,
            'langOptions' => $langOptions,
            'docTypesOptions' => $docTypesOptions
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
        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'edit-documents')){
            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to edit a document but is not allowed to do it');
            return $this->renderPage($response, self::TEMPLATE_ERROR_NOT_ALLOWED, [
                'message' => 'You are not authorized to edit document settings'
            ]);
        }
        
        $docId = $request->getAttribute('id');
        $dataManager = $this->dataManager;
        $docInfo = $dataManager->getDocById($docId);
        
        $availableImageSources = $this->hookManager->callHookedMethods('get-image-sources', []);
        
        $imageSourceOptions = '';
        $docImageSourceIsImplemented = false;
        foreach($availableImageSources as $imageSource) {
            $imageSourceOptions .= '<option value="' . $imageSource . '"';
            if ($docInfo['image_source'] === $imageSource) {
                $imageSourceOptions .= ' selected';
                $docImageSourceIsImplemented = true;
            }
            $imageSourceOptions .= '>' . $imageSource . '</option>';
        }
        
        
        $languages = $this->languages;
        $langOptions = '';
        foreach($languages as $lang) {
            $langOptions .= '<option value="' . $lang['code'] . '"';
            if ($docInfo['lang'] === $lang['code']) {
                $langOptions  .= ' selected';
            }
            $langOptions .= '>' . $lang['name'] . '</option>';
        }
        
        $docTypes = [ ['mss', 'Manuscript'], ['print', 'Print']];
        $docTypesOptions = '';
        foreach($docTypes as $type) {
            $docTypesOptions .= '<option value="' . $type[0] . '"';
            if ($docInfo['doc_type'] === $type[0]) {
                $docTypesOptions  .= ' selected';
            }
            $docTypesOptions .= '>' . $type[1] . '</option>';
        }
        
        $canBeDeleted = false;
        $nPages = $dataManager->getPageCountByDocIdAllTime($docId);
        $this->logger->debug("nPages all time: " . $nPages);
        if ($nPages === 0) {
            $canBeDeleted = true;
        }
        $this->profiler->stop();
        $this->logProfilerData('editDocPage-' . $docId);
        return $this->renderPage($response, self::TEMPLATE_DOC_EDIT_PAGE, [
            'docInfo' => $docInfo,
            'imageSourceOptions' => $imageSourceOptions,
            'langOptions' => $langOptions,
            'docTypesOptions' => $docTypesOptions,
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
        
        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'define-doc-pages')){
            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to define document pages  but is not allowed to do it');
            return $this->renderPage($response, self::TEMPLATE_ERROR_NOT_ALLOWED, [
                'message' => 'You are not authorized to edit document settings'
            ]);
        }
        
        $docId = $request->getAttribute('id');
        $db = $this->dataManager;
        $doc = [];
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $transcribedPages = $db->getTranscribedPageListByDocId($docId);
        $pagesInfo = $db->getDocPageInfo($docId);
        $pageTypes  = $this->dataManager->getPageTypeNames();
        $doc['numTranscribedPages'] = count($transcribedPages);
        $doc['docInfo'] = $db->getDocById($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = $this->buildPageArray($pagesInfo, 
                $transcribedPages);

        $this->profiler->stop();
        $this->logProfilerData('defineDocPages-' . $docId);
        return $this->renderPage($response, self::TEMPLATE_DEFINE_DOC_PAGES, [
            'pageTypes' => $pageTypes,
            'doc' => $doc
        ]);
    }
}
