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

namespace APM\Api;

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use RuntimeException;


/**
 * API Controller class
 *
 */
class ApiDocuments extends ApiController
{

    const CLASS_NAME = 'Documents';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function updatePageSettings(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $this->profiler->start();

        if ($this->systemManager->getUserManager()->hasTag($this->apiUserId, UserTag::READ_ONLY)) {
            $this->logger->error("User is not authorized to update page settings",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not authorized to update page settings'
                    ], 409);
        }
        
        $pageId = (int) $request->getAttribute('pageId');
        $postData = $request->getParsedBody();
        $this->logger->debug("Update page settings, postData", [ $postData]);
        $foliation = $postData['foliation'];
        $type = (int) $postData['type'];
        $lang = intval($postData['lang']);

        try {
            $pageInfo = $this->systemManager->getDocumentManager()->getPageInfo($pageId);
        } catch (PageNotFoundException $e) {
            $this->logger->info("Page not found", [ 'pageId' => $pageId]);
            return $this->responseWithText($response, "Page not found", HttpStatus::NOT_FOUND);
        }
        $pageInfo->foliation = $foliation;
        $pageInfo->foliationIsSet = true;
        $pageInfo->type = $type;
        $pageInfo->lang = $lang;

        try {
            $this->systemManager->getTranscriptionManager()->updatePageSettings($pageId, $pageInfo, $this->apiUserId);
        } catch (Exception $e) {
            $this->logger->error("Can't update page settings for page $pageId: " . $e->getMessage(), get_object_vars($pageInfo));
            return $this->responseWithStatus($response, 409);
        }
        $this->systemManager->onUpdatePageSettings($this->apiUserId, $pageId);
        return $this->responseWithStatus($response, 200);
    }

    public function getPageTypes(Request $request, Response $response): Response
    {
        $this->profiler->start();
        return $this->responseWithJson($response,
            $this->systemManager->getEntitySystem()->getAllEntitiesForType(Entity::tPageType));
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @deprecated Documents can not be deleted!
     */
    public function deleteDocument(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);


//        $dataManager = $this->getDataManager();
//        $this->profiler->start();
//        $docId = (int) $request->getAttribute('id');
//
//        if (!$this->systemManager->getUserManager()->isRoot($this->apiUserId)){
//            $this->logger->warning("deleteDocument: unauthorized request",
//                    [ 'apiUserTid' => $this->apiUserId, 'docId' => $docId]
//                );
//            return $this->responseWithStatus($response, 403);
//        }
//        $docManager = $this->systemManager->getDocumentManager();
//        try {
//            $docEntityData = $docManager->getDocumentEntityData($docId);
//        } catch (DocumentNotFoundException $e) {
//            $this->logger->error("Delete document: document does not exist",
//                [ 'apiUserTid' => $this->apiUserId,
//                    'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT,
//                    'docId' => $docId ]);
//            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist'], 409);
//        }
//
//        // Make sure the document is safe to delete
//        $nPages = $dataManager->getPageCountByDocIdAllTime($docId);
//        if ($nPages !== 0) {
//            $this->logger->error("Delete document: document cannot be safely deleted",
//                    [ 'apiUserTid' => $this->apiUserId,
//                      'apiError' => ApiController::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED,
//                      'docId' => $docId,
//                      'pageCountAllTime' => $nPages]);
//            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 'msg' => 'Document cannot be safely deleted'], 409);
//        }
//
//        $result = $dataManager->deleteDocById($docId);
//        if ($result === false) {
//            $this->logger->error("Delete document: cannot delete",
//                    [ 'apiUserTid' => $this->apiUserId,
//                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
//                      'docId' => $docId]);
//            return $this->responseWithJson($response,['error' => ApiController::API_ERROR_DB_UPDATE_ERROR, 'msg' => 'Database error'], 409);
//        }
//        $this->systemManager->onDocumentDeleted($this->apiUserId, $docId);

        $docId = (int) $request->getAttribute('id');
        $this->logger->error("Deprecated API call: delete document with id $docId");
        return $this->responseWithJson($response,
            [   'error' => ApiController::API_ERROR_DEPRECATED,
                'msg' => 'Documents cannot be deleted'], HttpStatus::BAD_REQUEST);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function addPages(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $this->debugMode = true;
        $documentManager = $this->systemManager->getDocumentManager();

        $this->profiler->start();

        $docId = (int) $request->getAttribute('id');
        try {
            $docData = $documentManager->getDocumentEntityData($docId);
        } catch (DocumentNotFoundException) {
            $this->logger->error("Add Pages: document does not exist",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT,
                    'docId' => $docId ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist'], 409);
        }

        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        
        
        if (!isset($postData['numPages'])) {
            $this->logger->error("Add pages: no data in input",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }
        
        $numPages = (int) json_decode($postData['numPages'], true);
        
        if ($numPages === 0) {
            // nothing to do!
            $this->debug("addPages: request for 0 pages, nothing to do");
            return $this->responseWithStatus($response, 200);
        }
        $this->debug("addPages: request for " . $numPages . " new pages");

        try {
            $curNumPages = $documentManager->getDocPageCount($docId);
        } catch (DocumentNotFoundException $e) {
            // should never happen
            $this->logger->error("Document not found getting page count: " . $e->getMessage());
            return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
        }
        $docLang = $docData->getObjectForPredicate(Entity::pDocumentLanguage);

        $this->debug("Doc $docId has $curNumPages pages, creating $numPages more with language $docLang");
        for ($i = $curNumPages; $i < ($numPages+$curNumPages); $i++) {
            try {
                $documentManager->createPage($docId, $i + 1, $docLang);
            } catch (DocumentNotFoundException $e) {
                // should never happen
                $this->logger->error("Document not found creating page: " . $e->getMessage());
                return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
            } catch (Exception $e) {
                $this->logger->error("Add pages: cannot create page",
                    [ 'apiUserTid' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                        'curNumPages' => $curNumPages,
                        'requestedNewPages' => $numPages,
                        'pageNumberNotCreated' => $i,
                        'exceptionMessage' => $e->getMessage()
                    ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
            }
        }

        $this->systemManager->onDocumentUpdated($this->apiUserId, $docId);
        return $this->responseWithStatus($response, 200);
    }


    /**
     * @param Request $request
     * @param Response $response
     * @param array $args
     * @return Response
     * @throws UserNotFoundException
     */
    public function createDocument(Request $request, Response $response, array $args): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $this->profiler->start();


        // TODO: implement proper user permissions
        if (!$this->systemManager->getUserManager()->isRoot($this->apiUserId)) {
            $this->logger->warning("Create document: unauthorized request",
                ['apiUserTid' => $this->apiUserId]
            );
            return $this->responseWithStatus($response, 403);
        }

        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);

        $this->logger->debug("Post", [ 'rawData' => $rawData, 'postData' => $postData ]);

        $name = $postData['name'] ?? '';
        $type = $postData['type'] ?? null;
        $lang = $postData['lang'] ?? null;
        $imageSource = $postData['imageSource'] ?? null;
        $imageSourceData = $postData['imageSourceData'] ?? null;

        if ($name === '') {
            $this->logger->error("New Document: no name provided",
                ['apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_NO_DATA,]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        $newDocId = $this->systemManager->getDocumentManager()->createDocument($name, $type,
            $lang, $imageSource, $imageSourceData, $this->apiUserId);

        $this->systemManager->onDocumentAdded($this->apiUserId, $newDocId);
        return $this->responseWithJson($response, $newDocId);
    }



    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function newDocumentOld(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $this->profiler->start();
        
        if (!$this->systemManager->getUserManager()->isRoot($this->apiUserId)){
            $this->logger->warning("New Doc: unauthorized request",
                    [ 'apiUserTid' => $this->apiUserId]
                );
            return $this->responseWithStatus($response, 403);
        }
        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        $docSettings = null;
        if (isset($postData['data'])) {
            $docSettings = json_decode($postData['data'], true);
        }
        
        if (is_null($docSettings) ) {
            $this->logger->error("New document: no data in input",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        $this->debug('New doc',[ 'apiUserTid' => $this->apiUserId,
                      'docSettings' => $docSettings] );

        $langId = $this->systemManager->getLangIdFromCode($docSettings['lang']);
        if ($langId === null) {
            $this->logger->error("Invalid language",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_NO_DATA,
                    'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_BAD_REQUEST], 409);
        }
        $docType = Entity::DocTypeManuscript;
        if ($docSettings['doc_type'] === 'print') {
            $docType = Entity::DocTypePrint;
        }
        $imageSource = $docSettings['image_source'] === 'bilderberg' ? Entity::ImageSourceBilderberg : Entity::ImageSourceAverroesServer;

        try {
            $docId = $this->systemManager->getDocumentManager()->createDocument(
                $docSettings['title'],
                $langId,
                $docType,
                $imageSource,
                $docSettings['image_source_data'],
                $this->apiUserId
            );
        } catch (Exception $e) {
            $this->logger->error("New document: cannot create",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                    'docSettings' => $docSettings,
                    'exceptionMessage' => $e->getMessage()
                ]
            );
            return $this->responseWithJson($response,['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
        }
        $this->systemManager->onDocumentAdded($this->apiUserId, $docId);
        return  $this->responseWithJson($response, ['newDocId' => $docId]);
        
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function updateDocSettings(Request $request, Response $response): Response
    {

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $dataManager = $this->getDataManager();
        $docManager = $this->systemManager->getDocumentManager();

        $docId = (int) $request->getAttribute('id');
        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        $newSettings = null;
        if (isset($postData['data'])) {
            $newSettings = json_decode($postData['data'], true);
        }
        
        if (is_null($newSettings) ) {
            $this->logger->error("Doc settings update: no data in input",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        if (isset($newSettings['lang'])) {
            $langId = $this->systemManager->getLangIdFromCode($newSettings['lang']);
            if ($langId === null) {
                $this->logger->error("Invalid language " . $newSettings['lang'],
                    [ 'apiUserTid' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_NO_DATA,
                        'data' => $postData]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_BAD_REQUEST], 409);
            }
            $newSettings['lang'] = $langId;
        }

        try {
            $docInfo = $docManager->getLegacyDocInfo($docId);
        } catch (DocumentNotFoundException) {
            $this->logger->error("Doc  settings update: document does not exist",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_NO_DATA,
                    'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT], 409);
        }


        try {
            $dataManager->updateDocSettings($docId, $newSettings);
        } catch (Exception $e) {
            $this->logger->error("Error writing new doc settings to DB",
                [ 'apiUserTid' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                    'exception' => $e->getCode(),
                    'exceptionMsg' => $e->getMessage(),
                    'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
        }

        $this->logger->info("Doc update settings", [
            'apiUserTid' => $this->apiUserId,
            'newSettings' => $newSettings
            ]);


        // update pages
        if ($docInfo['lang'] !== $newSettings['lang']) {
            try {
                $pages = $docManager->getLegacyDocPageInfoArray($docId);
            } catch (DocumentNotFoundException $e) {
                // should never happen
                $this->logger->error("Document not found getting page info for doc $docId: " . $e->getMessage());
                return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
            }
            foreach($pages as $page) {
                $docManager->updatePageSettings($page['id'], [ 'lang' => $newSettings['lang']]);
            }
        }

        $this->systemManager->onDocumentUpdated($this->apiUserId, $docId);
        return $this->responseWithStatus($response, 200);
        
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function updatePageSettingsBulk(Request $request, Response $response) : Response
    {

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $transcriptionManager = $this->systemManager->getTranscriptionManager();

        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        $inputArray = null;
        if (isset($postData['data'])) {
            $inputArray = json_decode($postData['data'], true);
        }
        
        if (is_null($inputArray) ) {
            $this->logger->error("Bulk page settings update: no data in input",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }
        
        $errors = [];
        foreach($inputArray as $pageDef) {
            if (!isset($pageDef['docId']) && !isset($pageDef['page'])) {
                $errors[] = "No docId or page in request" . print_r($pageDef, true);
                continue;
            }

            $docId = intval($pageDef['docId']);
            $pageNumber = intval($pageDef['page']);

            try {
                $pageInfo = $transcriptionManager->getPageInfoByDocPage($docId, $pageNumber);
            } catch (PageNotFoundException|DocumentNotFoundException) {
                $errors[] = "Page not found, doc " . $pageDef['docId'] . " page " . $pageDef['page'];
                continue;
            }

            $pageId = $pageInfo->pageId;

            $newPageInfo = clone $pageInfo;

            if (isset($pageDef['type'])) {
                $newPageInfo->type = $pageDef['type'];
            }
            
            if (isset($pageDef['foliation'])) {
                if (!isset($pageDef['overwriteFoliation'])) {
                    $errors[] = "No overwriteFoliation in request, " . $pageDef['docId'] . " page " . $pageDef['page'];
                    continue;
                }
                if ($pageDef['overwriteFoliation']) {
                    $newPageInfo->foliation = $pageDef['foliation'];
                    $newPageInfo->foliationIsSet = true;
                }
            }
            
            if (isset($pageDef['cols'])) {
                if ($pageInfo->numCols < $pageDef['cols']) {
                    $newPageInfo->numCols = $pageDef['cols'];
                } else {
                    // nothing to be done if asking for less or equal number of columns than what's already in the page
                    $this->debug("Asked for " . $pageDef['cols'] . " col(s), currently " . $pageInfo->numCols . " col(s). Nothing done. ");
                }
            }
            $this->logger->debug("Updating page settings for page $pageId", [
                'oldData' => get_object_vars($pageInfo),
                'newData' => get_object_vars($newPageInfo)
            ]);
            $transcriptionManager->updatePageSettings($pageId, $newPageInfo, $this->apiUserId);
        }

        $this->logger->info("Bulk page settings", [
            'apiUserTid'=> $this->apiUserId,
            'count' => count($inputArray)
            ]);
        if (count($errors) > 0) {
            $this->logger->notice("Bulk page settings update with errors", $errors);
        }

        return $this->responseWithStatus($response, 200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getNumColumns(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        
        $numColumns = $this->getDataManager()->getNumColumns($docId, $pageNumber);
        $this->info("getNumColumns successful", [ 'docId' => $docId, 'pageNumber' => $pageNumber]);

        return $this->responseWithJson($response, $numColumns);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function addNewColumn(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');

        if ($this->systemManager->getUserManager()->hasTag($this->apiUserId, UserTag::READ_ONLY)) {
            $this->logger->error("User is not authorized to add new column",
                    [ 'apiUserTd' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not authorized to add new columns'
                    ], HttpStatus::UNAUTHORIZED);
        }

        $documentManager = $this->systemManager->getDocumentManager();

        try {
            $pageId = $documentManager->getPageIdByDocPage($docId, $pageNumber);
        } catch (\APM\System\Document\Exception\PageNotFoundException) {
            // page does not exist
            $this->logger->error("Page not found", ['docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_WRONG_PAGE_ID,
                    'msg' => "Page not found, doc $docId page $pageNumber"
                ], HttpStatus::BAD_REQUEST);
        } catch (DocumentNotFoundException) {
            $this->logger->error("Doc not found", ['docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_WRONG_DOCUMENT,
                    'msg' => "Doc $docId not found"
                ], HttpStatus::BAD_REQUEST);
        }

        try {
            $documentManager->addColumn($pageId);
        } catch (\APM\System\Document\Exception\PageNotFoundException $e) {
            // should never happen!
            $this->logger->error("Runtime Error: " . $e->getMessage(), [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_RUNTIME_ERROR,
                    'msg' => "Server runtime error"
                ], HttpStatus::INTERNAL_SERVER_ERROR);
        }

        try {
            $numColumns = $documentManager->getNumColumns($pageId);
        } catch (\APM\System\Document\Exception\PageNotFoundException $e) {
            // should never happen!
            $this->logger->error("Runtime Error: " . $e->getMessage(), [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_RUNTIME_ERROR,
                    'msg' => "Server runtime error"
                ], HttpStatus::INTERNAL_SERVER_ERROR);
        }

        $this->logger->info("User $this->apiUserId added one column to page $pageId", [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
        return $this->responseWithJson($response, $numColumns);
   }

    /**
     * Returns page information for a list of pages identified by page id
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getPageInfo(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $inputData = $this->checkAndGetInputData($request, $response, ['pages']);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $returnData = [];

        for($i = 0; $i<count($inputData['pages']); $i++) {
            $pageId = $inputData['pages'][$i];
            try {
                $pageInfo = $this->systemManager->getDocumentManager()->getPageInfo($pageId);
            } catch (\APM\System\Document\Exception\PageNotFoundException $e) {
                    $this->logger->error("Page $pageId not found", [ 'errorMsg' => $e->getMessage(), 'errorCode' ]);
                    return $this->responseWithText($response,"Page $pageId not found", HttpStatus::NOT_FOUND);
            } catch (RuntimeException $e) {
                $this->logException($e, "Generic Exception from getPageInfoById, page $pageId");
                return $this->responseWithText($response, "Server error", HttpStatus::INTERNAL_SERVER_ERROR);
            }
            $returnData[] = [
                'id' => $pageId,
                'docId' => $pageInfo->docId,
                'pageNumber' => $pageInfo->pageNumber,
                'seq' => $pageInfo->sequence,
                'numCols' => $pageInfo->numCols,
                'foliation' => $pageInfo->foliation
            ];
        }
        return $this->responseWithJson($response, $returnData);
    }
   
}
