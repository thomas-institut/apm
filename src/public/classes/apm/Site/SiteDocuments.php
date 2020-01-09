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
use AverroesProject\Data\DataManager;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

/**
 * SiteDocuments class
 *
 */
class SiteDocuments extends SiteController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function documentsPage(Request $request, Response $response)
    {

        $dataManager = $this->dataManager;
        $this->profiler->start();
        $docIds = $dataManager->getDocIdList('title');
        $this->profiler->lap('Doc Id List');
        $docs = array();
        foreach ($docIds as $docId){
            //$profiler->lap("Doc $docId - START");
            $doc = array();
            $doc['numPages'] = $dataManager->getPageCountByDocId($docId);
            $transcribedPages = $dataManager->getTranscribedPageListByDocId($docId);
            $doc['numTranscribedPages'] = count($transcribedPages);
            $editorsIds = $dataManager->getEditorsByDocId($docId);
            $doc['editors'] = [];
            foreach ($editorsIds as $edId){
                $doc['editors'][] = 
                        $this->dataManager->userManager->getUserInfoByUserId($edId);
            }
            $doc['docInfo'] = $dataManager->getDocById($docId);
            $doc['tableId'] = "doc-$docId-table";
            array_push($docs, $doc);
                    }
        
        $canManageDocuments = false;
        if ($this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'docs-create-new')) {
            $canManageDocuments = true;
        }
        $this->profiler->stop();
        $this->logProfilerData('documentsPage');

        return $this->renderPage($response, 'docs.twig', [
            'docs' => $docs,
            'canManageDocuments' => $canManageDocuments
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function showDocPage(Request $request, Response $response)
    {
        
        $docId = $request->getAttribute('id');

        $chunkSegmentErrorMessages = [];
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::VALID] = '';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::NO_CHUNK_START] = 'No chunk start found';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::NO_CHUNK_END] = 'No chunk end found';
        $chunkSegmentErrorMessages[ApmChunkSegmentLocation::CHUNK_START_AFTER_END] = 'Chunk start after chunk end';


        $this->profiler->start();
        $dataManager = $this->dataManager;
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $pageManager = $transcriptionManager->getPageManager();

        $doc = [];
        $doc['numPages'] = $dataManager->getPageCountByDocId($docId);
        $transcribedPages = $transcriptionManager->getTranscribedPageListByDocId($docId);
        //$pagesInfo = $dataManager->getDocPageInfo($docId, DataManager::ORDER_BY_SEQ);
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



        $chunkLocationMap = $transcriptionManager->getChunkLocationMapForDoc($docId, '');

        $chunkInfo = [];

        foreach($chunkLocationMap as $workId => $chunkArray) {
            foreach ($chunkArray as $chunkNumber => $docArray) {
                foreach($docArray as $docIdInMap => $segments) {
                    foreach($segments as $segmentNumber => $location) {
                        /** @var $location ApmChunkSegmentLocation */
                        if ( $location->start->isZero()) {
                            $start  = '';
                        } else {
                            $pageInfo = $transcriptionManager->getPageInfoByDocSeq($docId, $location->start->pageSequence);
                            $start = [
                                'seq' => $location->start->pageSequence,
                                'foliation' => $pageInfo->foliation,
                                'column' => $location->start->columnNumber,
                                'numColumns' => $pageInfo->numCols
                            ];
                        }
                        if ( $location->end->isZero()) {
                            $end  = '';
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

        return $this->renderPage($response, 'doc.showdoc.twig', [
            'navByPage' => false,
            'canDefinePages' => $canDefinePages,
            'doc' => $doc,
            'chunkInfo' => $chunkInfo,
            'works' => $works
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function newDocPage(Request $request, Response $response)
    {
     
        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'create-new-documents')){
            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to add new doc but is not allowed to do it');
            return $this->renderPage($response, 'error.notallowed.twig', [
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
        
        return $this->renderPage($response, 'doc.new.twig', [
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
    public function editDocPage(Request $request, Response $response)
    {
        $this->profiler->start();
        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'edit-documents')){
            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to edit a document but is not allowed to do it');
            return $this->renderPage($response, 'error.notallowed.twig', [
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
        return $this->renderPage($response, 'doc.edit.twig', [
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
    public function defineDocPages(Request $request, Response $response)
    {
        $this->profiler->start();
        
        if (!$this->dataManager->userManager->isUserAllowedTo($this->userInfo['id'], 'define-doc-pages')){
            $this->logger->debug("User " . $this->userInfo['id'] . ' tried to define document pages  but is not allowed to do it');
            return $this->renderPage($response, 'error.notallowed.twig', [
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
        return $this->renderPage($response, 'doc.defdocpages.twig', [
            'pageTypes' => $pageTypes,
            'doc' => $doc
        ]);
    }
}
