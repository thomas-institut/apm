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
use ThomasInstitut\DataCache\ItemNotInCacheException;


/**
 * API Controller class
 *
 */
class ApiDocuments extends ApiController
{

    const string CLASS_NAME = 'Documents';


    /**
     * Returns the "true" docId, which the entity id
     * for a given docId that might an old database id
     *
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getDocId(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $givenDocId = intval($request->getAttribute('docId'));

        if ($givenDocId < 1) {
            return $this->responseWithJson($response, [
                'error' => "Invalid document Id"
            ], HttpStatus::BAD_REQUEST);
        }

        if ($givenDocId > 2000) {
            // for sure this the given id is not a database id,
            // so just return it, no need to query anything
            return $this->responseWithJson($response, [
                'givenDocId' => $givenDocId,
                'docId' => $givenDocId
            ]);
        }

        // this info can be cached forever, it will never change
        $cacheKey = implode(':', [ 'ApiDocuments', 'docId',  $givenDocId ]);

        try {
            $docId = intval($this->systemManager->getSystemDataCache()->get($cacheKey));
            return $this->responseWithJson($response, [
                'givenDocId' => $givenDocId,
                'docId' => $docId,
            ]);
        }  catch (ItemNotInCacheException) {
            // keep going
        }

        try {
            $docInfo = $this->systemManager->getDocumentManager()->getDocInfo($givenDocId);
        } catch (DocumentNotFoundException) {
            return $this->responseWithJson($response, [
                'error' => "Document not found"
            ], HttpStatus::NOT_FOUND);
        }
        $this->systemManager->getSystemDataCache()->set($cacheKey, $docInfo->id, 0);

        return $this->responseWithJson($response, [
            'givenDocId' => $givenDocId,
            'docId' => $docInfo->id,
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function updatePageSettings(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

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
        } catch (PageNotFoundException) {
            $this->logger->info("Page not found", [ 'pageId' => $pageId]);
            return $this->responseWithText($response, "Page not found", HttpStatus::NOT_FOUND);
        }
        $pageInfo->foliation = $foliation;
        $pageInfo->foliationIsSet = true;
        // TODO: check that this values are valid
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
        return $this->responseWithJson($response,
            $this->systemManager->getEntitySystem()->getAllEntitiesForType(Entity::tPageType));
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

        // TODO: implement proper user permissions
        if (!$this->systemManager->getUserManager()->isRoot($this->apiUserId)) {
            $this->logger->warning("Create document: unauthorized request",
                ['apiUserTid' => $this->apiUserId]
            );
            return $this->responseWithStatus($response, 403);
        }

        $inputJson = $request->getBody()->getContents();
        $postData =  json_decode($inputJson, true);

        if (is_null($postData)) {
            $this->logger->error("New Document: no data in input");
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

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
            $validLanguages = $this->systemManager->getEntitySystem()->getAllEntitiesForType(Entity::tLanguage);
            if (isset($pageDef['lang'])) {
                $newLang = intval($pageDef['lang']);
                if (in_array($newLang, $validLanguages)) {
                    $newPageInfo->lang = $newLang;
                } else {
                    $this->logger->warning("Attempt to set a page language to invalid entity id $newLang");
                }
            }
            $this->logger->debug("Updating page settings for page $pageId", [
                'oldData' => get_object_vars($pageInfo),
                'newData' => get_object_vars($newPageInfo)
            ]);
            try {
                $this->systemManager->getTranscriptionManager()->updatePageSettings($pageId, $newPageInfo, $this->apiUserId);
            } catch (Exception $e) {
                $this->logger->error("Can't update page settings for page $pageId: " . $e->getMessage(), get_object_vars($pageInfo));
                return $this->responseWithText($response, "Error updating page $pageId ($docId:$pageNumber)", 409);
            }
            $this->systemManager->onUpdatePageSettings($this->apiUserId, $pageId);
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

        $docManager = $this->systemManager->getDocumentManager();

        try {
            $numColumns = $docManager->getPageInfo($docManager->getPageIdByDocPage($docId, $pageNumber))->numCols;
        } catch (DocumentNotFoundException|PageNotFoundException $e) {
            $this->logger->info("Doc/Page not found in API call to getNumColumns: $docId:$pageNumber");
            return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
        }
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
        } catch (PageNotFoundException) {
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
        } catch (PageNotFoundException $e) {
            // should never happen!
            $this->logger->error("Runtime Error: " . $e->getMessage(), [ 'docId' => $docId, 'pageNumber' => $pageNumber]);
            return $this->responseWithJson($response,
                ['error' => ApiController::API_ERROR_RUNTIME_ERROR,
                    'msg' => "Server runtime error"
                ], HttpStatus::INTERNAL_SERVER_ERROR);
        }

        try {
            $numColumns = $documentManager->getNumColumns($pageId);
        } catch (PageNotFoundException $e) {
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
            } catch (PageNotFoundException $e) {
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
