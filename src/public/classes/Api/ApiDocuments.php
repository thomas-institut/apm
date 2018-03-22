<?php
/*
 * Copyright (C) 2016-2018 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace AverroesProject\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

/**
 * API Controller class
 *
 */
class ApiDocuments extends ApiController
{
    
    public function updatePageSettings(Request $request, Response $response, $next)
    {
        $profiler = new ApmProfiler('updatePageSettings', $this->db);
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
        
        $r = $this->ci->db->updatePageSettings($pageId, $newSettings);
        if ($r === false) {
            $this->logger->error("Can't update page settings for page $pageId", $newSettings);
            return $response->withStatus(409);
        }
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
    
    public function deleteDocument(Request $request, Response $response, $next) 
    {
        $profiler = new ApmProfiler('deleteDocument', $this->db);
        $docId = (int) $request->getAttribute('id');
        //$this->logger->debug("Request to delete doc " . $docId);
        if (!$this->db->um->isUserAllowedTo($this->ci->userId, 'delete-documents')){
            $this->logger->warning("deleteDocument: unauthorized request", 
                    [ 'apiUserId' => $this->ci->userId, 'docId' => $docId]
                );
            return $response->withStatus(403);
        }
        
        $docSettings = $this->ci->db->getDocById($docId);
        if ($docSettings === false) {
            $this->logger->error("Delete document: document does not exist",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT, 
                      'docId' => $docId ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist']);
        }
        
        // Make sure the document is safe to delete
        $nPages = $this->ci->db->getPageCountByDocIdAllTime($docId);
        if ($nPages !== 0) {
            $this->logger->error("Delete document: document cannot be safely deleted",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 
                      'docId' => $docId, 
                      'pageCountAllTime' => $nPages]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 'msg' => 'Document cannot be safely deleted']);
        }
        
        $result = $this->ci->db->deleteDocById($docId);
        if ($result === false) {
            $this->logger->error("Delete document: cannot delete",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'docId' => $docId]);
            return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_DB_UPDATE_ERROR, 'msg' => 'Database erorr']);
        }
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
    public function addPages(Request $request, Response $response, $next) 
    {
        $profiler = new ApmProfiler('addPages', $this->db);
        
        if (!$this->db->um->isUserAllowedTo($this->ci->userId, 'add-pages')){
            $this->logger->warning("addPages: unauthorized request", 
                    [ 'apiUserId' => $this->ci->userId]
                );
            return $response->withStatus(403);
        }
        
        $docId = (int) $request->getAttribute('id');
        $docInfo = $this->ci->db->getDocById($docId);
        if ($docInfo === false) {
            $this->logger->error("Add Pages: document does not exist",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_WRONG_DOCUMENT, 
                      'docId' => $docId ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist']);
        }
        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        
        
        if (!isset($postData['numPages'])) {
            $this->logger->error("Add pages: no data in input",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        
        $numPages = (int) json_decode($postData['numPages'], true);
        
        if ($numPages === 0) {
            // nothing to do!
            $this->logger->debug("addPages: request for 0 pages, nothing to do");
            $profiler->log($this->logger);
            return $response->withStatus(200);
        }
        
        
        $this->logger->debug("addPages: request for " . $numPages . " new pages");
        
        $curNumPages = $this->db->getPageCountByDocId($docId);
        
        for ($i = $curNumPages; $i < ($numPages+$curNumPages); $i++) {
            $pageId = $this->db->newPage($docId, $i+1, $docInfo['lang']);
            if ($pageId === false) {
                $this->logger->error("Add pages: cannot create page",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'curNumPages' => $curNumPages,
                      'requestedNewPages' => $numPages,
                      'pageNumberNotCreated' => $i
                    ]);
                return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR]);
            }
        }
        
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
    public function newDocument(Request $request, Response $response, $next) 
    {
        $profiler = new ApmProfiler('New Doc', $this->db);
        
        if (!$this->db->um->isUserAllowedTo($this->ci->userId, 'create-new-document')){
            $this->logger->warning("New Doc: unauthorized request", 
                    [ 'apiUserId' => $this->ci->userId]
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
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        
        $dm = $this->db;
        
        $this->logger->debug('New doc',[ 'apiUserId' => $this->ci->userId, 
                      'docSettings' => $docSettings] );
        
        $docId = $dm->newDoc(
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
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_DB_UPDATE_ERROR,
                      'docSettings' => $docSettings]);
            return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_DB_UPDATE_ERROR]);
        }
        $profiler->log($this->logger);
        return $response->withStatus(200)->withJson(['newDocId' => $docId]);
        
    }
    
    public function updateDocSettings(Request $request, Response $response, $next)
    {
        $profiler = new ApmProfiler('updateDocSettings', $this->db);
        if (!$this->db->um->isUserAllowedTo($this->ci->userId, 'update-doc-settings')){
            $this->logger->warning("updateDocSettings: unauthorized request", 
                    [ 'apiUserId' => $this->ci->userId]
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
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        
        $dm = $this->db;
        $result = $dm->updateDocSettings($docId, $newSettings);
        if ($result === false) {
             $this->logger->error("Error writing new doc settings to DB",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_DB_UPDATE_ERROR]);
        }
        $this->logger->info("Doc update settings", [
            'apiUserId'=> $this->ci->userId, 
            'newSettings' => $newSettings
            ]);

        $profiler->log($this->logger);
        return $response->withStatus(200);
        
    }
    
    public function updatePageSettingsBulk(Request $request, Response $response, $next)
    {
        $profiler = new ApmProfiler('updatePageSettingsBulk', $this->db);
        
        if (!$this->db->um->isUserAllowedTo($this->ci->userId, 'update-page-settings-bulk')){
            
            $this->logger->warning("updatePageSettingsBulk: unauthorized request", 
                    [ 'apiUserId' => $this->ci->userId]
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
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        
        $dm = $this->db;
        $errors = [];
        foreach($inputArray as $pageDef) {
            if (!isset($pageDef['docId']) && !isset($pageDef['page'])) {
                $errors[] = "No docId or page in request" . print_r($pageDef, true);
                continue;
            }
            $pageId = $dm->getPageIdByDocPage($pageDef['docId'], $pageDef['page']);
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
                    $pageInfo = $dm->getPageInfo($pageId);
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
                $pageInfo = $dm->getPageInfo($pageId);
                if ($pageInfo['num_cols'] < $pageDef['cols']) {
                    // Add columns
                    for ($i = $pageInfo['num_cols']; $i < $pageDef['cols']; $i++) {
                        $this->db->addNewColumn($pageDef['docId'], $pageDef['page']);
                    }
                } else {
                    $this->logger->debug("Asked for " . $pageDef['cols'] . " col(s), currently " . $pageInfo['num_cols'] . " col(s). Nothing done. ");
                }
            }
            
            if (count(array_keys($newPageSettings)) === 0) {
                // nothing to do
                $this->logger->debug("Nothing to update for doc " . $pageDef['docId'] . " page " . $pageDef['page']);
                continue;
            }
            
            $dm->updatePageSettings($pageId, $newPageSettings);
        }
        
        $done = microtime(true);
        $this->logger->info("Bulk page settings", [
            'apiUserId'=> $this->ci->userId, 
            'count' => count($inputArray)
            ]);
        if (count($errors) > 0) {
            $this->logger->notice("Bulk page settings update with errors", $errors);
        }
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
   
    public function getNumColumns(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        
        $numColumns = $this->db->getNumColumns($docId, $pageNumber);
        
        return $response->withJson($numColumns);
    }
   
    public function addNewColumn(Request $request, Response $response, $next)
    {
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        
        $this->db->addNewColumn($docId, $pageNumber);
        
        $numColumns = $this->db->getNumColumns($docId, $pageNumber);
        $updaterInfo = $this->db->um->getUserInfoByUserId($this->ci->userId);
        $userName = $updaterInfo['username'];
        $this->logger->info("$userName added a column to " . 
                "doc $docId, page $pageNumber", 
                ['apiUserId' => $this->ci->userId]);
        
        return $response->withJson($numColumns);
   }
   
}
