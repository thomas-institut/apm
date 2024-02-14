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

use APM\FullTranscription\ApmPageManager;
use APM\FullTranscription\PageInfo;
use APM\FullTranscription\PageManager;
use DI\DependencyException;
use DI\NotFoundException;
use Exception;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\EntitySystem\Tid;


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
     */
    public function updatePageSettings(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $dataManager = $this->getDataManager();
        $this->profiler->start();
        
        $userManager = $dataManager->userManager;
         
        if ($userManager->userHasRole($this->apiUserId, 'readOnly')) {
            $this->logger->error("User is not authorized to update page settings",
                    [ 'apiUserId' => $this->apiUserId,
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
        $lang = $postData['lang'];

        $pageInfo = $this->systemManager->getTranscriptionManager()->getPageManager()->getPageInfoById($pageId);
        $pageInfo->foliation = $foliation;
        $pageInfo->foliationIsSet = true;
        $pageInfo->type = $type;
        $pageInfo->langCode = $lang;

        try {
            $this->systemManager->getTranscriptionManager()->updatePageSettings($pageId, $pageInfo, $this->apiUserId);
        } catch (Exception $e) {
            $this->logger->error("Can't update page settings for page $pageId: " . $e->getMessage(), $pageInfo->getDatabaseRow());
            return $this->responseWithStatus($response, 409);
        }
        $this->systemManager->onUpdatePageSettings($this->apiUserId, $pageId);
        return $this->responseWithStatus($response, 200);
    }

    public function getPageTypes(Request $request, Response $response): Response
    {
        $this->profiler->start();
        $pageTypes  = $this->dataManager->getPageTypeNames();
        return $this->responseWithJson($response, $pageTypes);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function deleteDocument(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $dataManager = $this->getDataManager();
        $this->profiler->start();
        $docId = (int) $request->getAttribute('id');

        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'delete-documents')){
            $this->logger->warning("deleteDocument: unauthorized request", 
                    [ 'apiUserId' => $this->apiUserId, 'docId' => $docId]
                );
            return $this->responseWithStatus($response, 403);
        }
        
        $docSettings = $dataManager->getDocById($docId);
        if ($docSettings === false) {
            $this->logger->error("Delete document: document does not exist",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT, 
                      'docId' => $docId ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist'], 409);
        }
        
        // Make sure the document is safe to delete
        $nPages = $dataManager->getPageCountByDocIdAllTime($docId);
        if ($nPages !== 0) {
            $this->logger->error("Delete document: document cannot be safely deleted",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 
                      'docId' => $docId, 
                      'pageCountAllTime' => $nPages]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 'msg' => 'Document cannot be safely deleted'], 409);
        }
        
        $result = $dataManager->deleteDocById($docId);
        if ($result === false) {
            $this->logger->error("Delete document: cannot delete",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'docId' => $docId]);
            return $this->responseWithJson($response,['error' => ApiController::API_ERROR_DB_UPDATE_ERROR, 'msg' => 'Database error'], 409);
        }
        $this->systemManager->onDocumentDeleted($this->apiUserId, $docId);
        return $this->responseWithStatus($response, 200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function addPages(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $dataManager = $this->getDataManager();
        $this->profiler->start();
//
//        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'add-pages')){
//            $this->logger->warning("addPages: unauthorized request",
//                    [ 'apiUserId' => $this->apiUserId]
//                );
//            return $this->responseWithStatus($response, 403);
//        }
        
        $docId = (int) $request->getAttribute('id');
        $docInfo = $dataManager->getDocById($docId);
        if ($docInfo === false) {
            $this->logger->error("Add Pages: document does not exist",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT, 
                      'docId' => $docId ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist'], 409);
        }
        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        
        
        if (!isset($postData['numPages'])) {
            $this->logger->error("Add pages: no data in input",
                    [ 'apiUserId' => $this->apiUserId,
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
        
        $curNumPages = $dataManager->getPageCountByDocId($docId);
        
        for ($i = $curNumPages; $i < ($numPages+$curNumPages); $i++) {
            $pageId = $dataManager->newPage($docId, $i+1, $docInfo['lang']);
            if ($pageId === false) {
                $this->logger->error("Add pages: cannot create page",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'curNumPages' => $curNumPages,
                      'requestedNewPages' => $numPages,
                      'pageNumberNotCreated' => $i
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
     * @return Response
     */
    public function newDocument(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $dataManager = $this->getDataManager();
        $this->profiler->start();
        
        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'create-new-document')){
            $this->logger->warning("New Doc: unauthorized request",
                    [ 'apiUserId' => $this->apiUserId]
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
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        $this->debug('New doc',[ 'apiUserId' => $this->apiUserId,
                      'docSettings' => $docSettings] );

        $docId = $dataManager->newDoc(
                $docSettings['title'], 
                '',
                0,  // start with 0 pages
                $docSettings['lang'],
                $docSettings['doc_type'],
                $docSettings['image_source'],
                $docSettings['image_source_data'],
                Tid::generateUnique()
            );
        
        if ($docId === false) {
            $this->logger->error("New document: cannot create",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'docSettings' => $docSettings]);
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
//        $this->profiler->start();

//        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'update-doc-settings')){
//            $this->logger->warning("updateDocSettings: unauthorized request",
//                    [ 'apiUserId' => $this->apiUserId]
//                );
//            return $this->responseWithStatus($response, 403);
//        }
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
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }

        $currentSettings = $dataManager->getDocById($docId);

        if ($currentSettings === false) {
            $this->logger->error("Doc  settings update: document does not exist",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_NO_DATA,
                    'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_DOCUMENT], 409);
        }
        

        try {
            $dataManager->updateDocSettings($docId, $newSettings);
        } catch (Exception $e) {
            $this->logger->error("Error writing new doc settings to DB",
                [ 'apiUserId' => $this->apiUserId,
                    'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                    'exception' => $e->getCode(),
                    'exceptionMsg' => $e->getMessage(),
                    'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
        }

        $this->logger->info("Doc update settings", [
            'apiUserId'=> $this->apiUserId,
            'newSettings' => $newSettings
            ]);


        // update pages
        if ($currentSettings['lang'] !== $newSettings['lang']) {
            $pages = $dataManager->getDocPageInfo($docId);
            foreach($pages as $page) {
                $result =  $dataManager->updatePageSettings($page['id'], [ 'lang' => $newSettings['lang']]);
                if ($result === false) {
                    $this->logger->error("Could not update language for page" . $page['id']);
                }
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

//        $dataManager = $this->getDataManager();
//        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'update-page-settings-bulk')){
//
//            $this->logger->warning("updatePageSettingsBulk: unauthorized request",
//                    [ 'apiUserId' => $this->apiUserId]
//                );
//            return $this->responseWithStatus($response, 403);
//        }
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        $inputArray = null;
        if (isset($postData['data'])) {
            $inputArray = json_decode($postData['data'], true);
        }
        
        if (is_null($inputArray) ) {
            $this->logger->error("Bulk page settings update: no data in input",
                    [ 'apiUserId' => $this->apiUserId,
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
                $pageInfo = $transcriptionManager->getPageManager()->getPageInfoByDocPage($docId, $pageNumber);
            } catch (InvalidArgumentException $e) {
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
            'apiUserId'=> $this->apiUserId,
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
     */
    public function addNewColumn(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');

        $dataManager = $this->getDataManager();
        
        $um = $dataManager->userManager;
         
        if ($um->userHasRole($this->apiUserId, 'readOnly')) {
            $this->logger->error("User is not authorized to add new column",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not authorized to add new columns'
                    ], 409);
        }
        
        $dataManager->addNewColumn($docId, $pageNumber);
        
        $numColumns = $dataManager->getNumColumns($docId, $pageNumber);
        $updaterInfo = $dataManager->userManager->getUserInfoByUserId($this->apiUserId);
        $userName = $updaterInfo['username'];
        $this->info("$userName added a column to " .
                "doc $docId, page $pageNumber", 
                ['apiUserId' => $this->apiUserId]);
        
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

//        $this->profiler->start();
        $inputData = $this->checkAndGetInputData($request, $response, ['pages']);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $returnData = [];
        $pageIds = [];

        for($i = 0; $i<count($inputData['pages']); $i++) {
            $pageId = $inputData['pages'][$i];
            try {
                $pageInfo = $this->systemManager->getTranscriptionManager()->getPageManager()->getPageInfoById($pageId);
            } catch (\InvalidArgumentException $e) {
                if ($e->getCode() === PageManager::ERROR_PAGE_NOT_FOUND) {
                    $this->logger->error("Page $pageId not found", [ 'errorMsg' => $e->getMessage(), 'errorCode' ]);
                    return $this->responseWithText($response,"Page $pageId not found", 404);
                }
                $this->logException($e, "Invalid Argument Exception from getPageInfoById, page $pageId");
                return $this->responseWithText($response, "Server error", 500);
            } catch (\Exception $e) {
                $this->logException($e, "Generic Exception from getPageInfoById, page $pageId");
                return $this->responseWithText($response, "Server error", 500);
            }

//            $pageIds[] = $pageId;
            $returnData[] = [
                'id' => $pageId,
                'docId' => $pageInfo->docId,
                'pageNumber' => $pageInfo->pageNumber,
                'seq' => $pageInfo->sequence,
                'numCols' => $pageInfo->numCols,
                'foliation' => $pageInfo->foliation
            ];
        }
        return $this->responseWithJson($response, $returnData, 200);

    }
   
}
