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

use DI\DependencyException;
use DI\NotFoundException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;


/**
 * API Controller class
 *
 */
class ApiDocuments extends ApiController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function updatePageSettings(Request $request, Response $response)
    {
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
        $foliation = $postData['foliation'];
        $type = (int) $postData['type'];
        $lang = $postData['lang'];
        $newSettings = [ 
            'foliation' => $foliation, 
            'type' => $type,
            'lang' => $lang
            ];
        
        $r = $dataManager->updatePageSettings($pageId, $newSettings);
        if ($r === false) {
            $this->logger->error("Can't update page settings for page $pageId", $newSettings);
            return $response->withStatus(409);
        }
        $this->profiler->stop();
        $this->logProfilerData("UpdatePageSettings-$pageId");
        return $response->withStatus(200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     * @throws \Exception
     */
    public function deleteDocument(Request $request, Response $response)
    {
        $dataManager = $this->getDataManager();
        $this->profiler->start();
        $docId = (int) $request->getAttribute('id');

        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'delete-documents')){
            $this->logger->warning("deleteDocument: unauthorized request", 
                    [ 'apiUserId' => $this->apiUserId, 'docId' => $docId]
                );
            return $response->withStatus(403);
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
        $this->profiler->stop();
        $this->logProfilerData("DeleteDoc-$docId");
        return $response->withStatus(200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function addPages(Request $request, Response $response)
    {
        $dataManager = $this->getDataManager();
        $this->profiler->start();
        
        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'add-pages')){
            $this->logger->warning("addPages: unauthorized request", 
                    [ 'apiUserId' => $this->apiUserId]
                );
            return $response->withStatus(403);
        }
        
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
            $this->logProfilerData('addPages');
            return $response->withStatus(200);
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

        $this->profiler->stop();
        $this->logProfilerData('addPages');
        return $response->withStatus(200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function newDocument(Request $request, Response $response)
    {
        $dataManager = $this->getDataManager();
        $this->profiler->start();
        
        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'create-new-document')){
            $this->logger->warning("New Doc: unauthorized request", 
                    [ 'apiUserId' => $this->apiUserId]
                );
            return $response->withStatus(403);
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
                $docSettings['short_title'],
                0,  // start with 0 pages
                $docSettings['lang'],
                $docSettings['doc_type'],
                $docSettings['image_source'],
                $docSettings['image_source_data']
            );
        
        if ($docId === false) {
            $this->logger->error("New document: cannot create",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'docSettings' => $docSettings]);
            return $this->responseWithJson($response,['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
        }
        $this->logProfilerData('NewDocument');
        return  $this->responseWithJson($response, ['newDocId' => $docId], 200);
        
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function updateDocSettings(Request $request, Response $response)
    {

        $dataManager = $this->getDataManager();

        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'update-doc-settings')){
            $this->logger->warning("updateDocSettings: unauthorized request", 
                    [ 'apiUserId' => $this->apiUserId]
                );
            return $response->withStatus(403);
        }
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
        

        $result = $dataManager->updateDocSettings($docId, $newSettings);
        if ($result === false) {
             $this->logger->error("Error writing new doc settings to DB",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR], 409);
        }
        $this->logger->info("Doc update settings", [
            'apiUserId'=> $this->apiUserId,
            'newSettings' => $newSettings
            ]);

        $this->profiler->stop();
        $this->logProfilerData("updateDocSettings-$docId");
        return $response->withStatus(200);
        
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function updatePageSettingsBulk(Request $request, Response $response)
    {

        $dataManager = $this->getDataManager();
        $this->profiler->start();
        
        if (!$dataManager->userManager->isUserAllowedTo($this->apiUserId, 'update-page-settings-bulk')){
            
            $this->logger->warning("updatePageSettingsBulk: unauthorized request", 
                    [ 'apiUserId' => $this->apiUserId]
                );
            return $response->withStatus(403);
        }
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
            $pageId = $dataManager->getPageIdByDocPage($pageDef['docId'], $pageDef['page']);
            if ($pageId === false) {
                $errors[] = "Page not found, doc " . $pageDef['docId'] . " page " . $pageDef['page'];
                continue;
            }
            
            $newPageSettings = [];
            
            if (isset($pageDef['type'])) {
                $newPageSettings['type'] = $pageDef['type'];
            }
            
            if (isset($pageDef['foliation'])) {
                if (!isset($pageDef['overwriteFoliation'])) {
                    $errors[] = "No overwriteFoliation in request, " . $pageDef['docId'] . " page " . $pageDef['page'];
                    continue;
                }
                if (!$pageDef['overwriteFoliation']) {
                    // do not overwrite foliation if foliation already exists
                    $pageInfo = $dataManager->getPageInfo($pageId);
                    if ($pageInfo === null) {
                        $errors[] = "Could not get page Info from DB, " . $pageDef['docId'] . " page " . $pageDef['page'];
                        continue;
                    }
                    if (is_null($pageInfo['foliation'])) {
                        // no page foliation exists, so, set the new one
                        $newPageSettings['foliation'] = $pageDef['foliation'];
                    }
                } else {
                    $newPageSettings['foliation'] = $pageDef['foliation'];
                }
            }
            
            if (isset($pageDef['cols'])) {
                $pageInfo = $dataManager->getPageInfo($pageId);
                if ($pageInfo['num_cols'] < $pageDef['cols']) {
                    // Add columns
                    for ($i = $pageInfo['num_cols']; $i < $pageDef['cols']; $i++) {
                        $dataManager->addNewColumn($pageDef['docId'], $pageDef['page']);
                    }
                } else {
                    $this->debug("Asked for " . $pageDef['cols'] . " col(s), currently " . $pageInfo['num_cols'] . " col(s). Nothing done. ");
                }
            }
            
            if (count(array_keys($newPageSettings)) === 0) {
                // nothing to do
                $this->debug("Nothing to update for doc " . $pageDef['docId'] . " page " . $pageDef['page']);
                continue;
            }
            
            $dataManager->updatePageSettings($pageId, $newPageSettings);
        }

        $this->logger->info("Bulk page settings", [
            'apiUserId'=> $this->apiUserId,
            'count' => count($inputArray)
            ]);
        if (count($errors) > 0) {
            $this->logger->notice("Bulk page settings update with errors", $errors);
        }
        $this->profiler->stop();
        $this->logProfilerData("updatePageSettingsBulk-$pageId");
        return $response->withStatus(200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function getNumColumns(Request $request, Response $response)
    {
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        
        $numColumns = $this->getDataManager()->getNumColumns($docId, $pageNumber);

        return $this->responseWithJson($response, $numColumns);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function addNewColumn(Request $request, Response $response)
    {
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
        $this->logger->info("$userName added a column to " . 
                "doc $docId, page $pageNumber", 
                ['apiUserId' => $this->apiUserId]);
        
        return $this->responseWithJson($response, $numColumns);
   }
   
}
