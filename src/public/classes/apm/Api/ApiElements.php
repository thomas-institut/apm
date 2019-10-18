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

use APM\System\SystemManager;
use AverroesProject\ColumnElement\Element;
use AverroesProject\Data\DataManager;
use AverroesProject\Data\EdNoteManager;
use DataTable\MySqlUnitemporalDataTable;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

/**
 * API Controller class
 *
 */
class ApiElements extends ApiController
{
    const API_ERROR_INVALID_VERSION_REQUESTED = 5001;
    
    public function updateElementsByDocPageCol(Request $request, 
            Response $response)
    {
        $dataManager = $this->getDataManager();
        
        $profiler = new ApmProfiler('updateElements', $dataManager);
        
        $userManager = $dataManager->userManager;
         
        if ($userManager->userHasRole($this->apiUserId, SystemManager::ROLE_READ_ONLY)) {
            $this->logger->error("User is not authorized to update elements",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not allowed to save'
                    ], 409);
        }
        
        
        $docId = (int) $request->getAttribute('document');
        $pageNumber = (int) $request->getAttribute('page');
        $columnNumber = (int) $request->getAttribute('column');
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputDataObject = null;
        
        
        if (isset($postData['data'])) {
            $inputDataObject = json_decode($postData['data'], true);
        }
        
        // Some checks: all required arrays, data with given docId, pageNo and colNumber
        if (is_null($inputDataObject) ) {
            $this->logger->error("Element update: no data in input",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }
        if (!isset($inputDataObject['elements']) ) {
            $this->logger->error("Input data array does not contain elements",
                    [ 'apiUserId' => $this->apiUserId,
                       'apiError' => ApiController::API_ERROR_NO_ELEMENT_ARRAY, 
                        'inputDataObject' => $inputDataObject
                    ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_ELEMENT_ARRAY], 409);
        }
        
        if (!isset($inputDataObject['ednotes']) ) {
            $this->logger->error("Input data array does not contain ednote array",
                    [ 'apiUserId' => $this->apiUserId,
                       'apiError' => ApiController::API_ERROR_NO_EDNOTES,  
                        'inputDataObject' => $inputDataObject]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_EDNOTES], 409);
        }
        
        if (count($inputDataObject['elements'])===0 ) {
            $this->logger->error("Empty element array to update column",
                    [ 'apiUserId' => $this->apiUserId,
                       'apiError' => ApiController::API_ERROR_ZERO_ELEMENTS,   
                        'inputDataObject' => $inputDataObject]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_ZERO_ELEMENTS], 409);
        }

        $versionDescr = '';
        $versionIsMinor = false;
        $versionIsReview = false;

        if (isset($inputDataObject['versionInfo'])) {
            $versionInfo = $inputDataObject['versionInfo'];
            if (isset($versionInfo['isMinor'])) {
                $versionIsMinor = $versionInfo['isMinor'];
            }
            if (isset($versionInfo['isReview'])) {
                $versionIsReview = $versionInfo['isReview'];
            }
            if (isset($versionInfo['descr'])) {
                $versionDescr = $versionInfo['descr'];
            }
        }

        // Check elements and force hand Id on items
        $pageId = $dataManager->getPageIdByDocPage($docId, $pageNumber);
        $newElementsArray = $inputDataObject['elements'];
        $edNotes = $inputDataObject['ednotes'];
        
        $requiredElementKeys = ['id', 'pageId', 'columnNumber', 'seq' , 'lang', 'handId', 'editorId', 'type', 'items', 'reference', 'placement'];
        $requiredItemProperties = ['id', 'type', 'seq', 'lang', 'theText', 'altText', 'extraInfo', 'target', 'columnElementId'];
        $requiredEdNoteKeys = ['id', 'type', 'target', 'authorId', 'text'];
        $givenItemIds = [];
        
        //print "Checking " . count($newElementsArray) . " elements\n";
        for ($i = 0; $i < count($newElementsArray); $i++) {
            // Check that all object properties are present
            foreach ($requiredElementKeys as $reqKey) {
                if (!array_key_exists($reqKey, $newElementsArray[$i])) {
                     $this->logger->error("Missing key in element: " . $reqKey,
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_MISSING_ELEMENT_KEY, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_MISSING_ELEMENT_KEY], 409);
                }
            }
            
            // check page Id
            if ($newElementsArray[$i]['pageId'] !== $pageId) {
                $this->logger->error("Element with wrong pageId in input array",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_PAGE_ID, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_PAGE_ID], 409);
            }
           
            // check columnNumber
            if ($newElementsArray[$i]['columnNumber'] !== $columnNumber) {
                $this->logger->error("Element with wrong columnNumber in input array",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_COLUMN_NUMBER,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_COLUMN_NUMBER], 409);
            }
            // check EditorId
            if (!$dataManager->userManager->userExistsById($newElementsArray[$i]['editorId'])) {
                $this->logger->error("Non existent editorId in input array",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_EDITOR_ID,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_EDITOR_ID], 409);
            }
            
            // Check that there are items, no empty elements allowed
            if ($newElementsArray[$i]['type'] !== Element::LINE_GAP &&  count($newElementsArray[$i]['items']) === 0) {
                $this->logger->error("Empty element in input array",
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_EMPTY_ELEMENT,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_EMPTY_ELEMENT], 409);
            }
            
            // Check that item data is complete
            // Force handId to 0 if not handId given
            // print "  Checking " . count($newElementsArray[$i]['items']) . " items for element $i\n";
            for ($j = 0; $j < count($newElementsArray[$i]['items']); $j++) {
                foreach ($requiredItemProperties as $reqKey) {
                    if (!array_key_exists($reqKey, $newElementsArray[$i]['items'][$j])) {
                        $this->logger->error("Missing key in item: " . $reqKey,
                            [ 'apiUserId' => $this->apiUserId,
                              'apiError' => ApiController::API_ERROR_MISSING_ITEM_KEY,
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'itemIndex' => $j,
                              'elementArray' => $newElementsArray[$i]
                            ]);
                        return $this->responseWithJson($response,['error' => ApiController::API_ERROR_MISSING_ITEM_KEY], 409);
                    }
                }
                $id = $newElementsArray[$i]['items'][$j]['id'];
                //print "Item ID = $id\n";
                if ($id !== -1) {
                    // Check for duplicate item Ids
                    if (isset($givenItemIds[$id])) {
                        $this->logger->error("Duplicate Item id : " . $id,
                        [ 'apiUserId' => $this->apiUserId,
                          'apiError' => ApiController::API_ERROR_DUPLICATE_ITEM_ID,
                          'docId' => $docId,
                          'pageNumber' => $pageNumber,
                          'columnNumber' => $columnNumber,
                          'itemIndex' => $j,
                          'elementArray' => $newElementsArray[$i]
                        ]);
                        return $this->responseWithJson($response,['error' => ApiController::API_ERROR_DUPLICATE_ITEM_ID], 409);
                    }
                    $givenItemIds[$id] = true;
                }
                if (!isset($newElementsArray[$i]['items'][$j]['handId'])) {
                    $newElementsArray[$i]['items'][$j]['handId'] = 0;
                }
            }
        }
        
        // Check ednotes
        for ($i = 0; $i < count($edNotes); $i++) {
            foreach ($requiredEdNoteKeys as $reqKey) {
                if (!array_key_exists($reqKey, $edNotes[$i])) {
                    $this->logger->error("Missing key in editorial note: " . $reqKey,
                        [ 'apiUserId' => $this->apiUserId,
                          'apiError' => ApiController::API_ERROR_MISSING_EDNOTE_KEY,
                          'docId' => $docId,
                          'pageNumber' => $pageNumber,
                          'columnNumber' => $columnNumber,
                          'edNoteIndex' => $i,
                          'edNote' => $edNotes[$i]
                        ]);
                    return $this->responseWithJson($response,['error' => ApiController::API_ERROR_MISSING_EDNOTE_KEY], 409);
                }
            }
            if (!isset($givenItemIds[$edNotes[$i]['target']])) {
                $this->logger->error("Bad target for editorial note: " . $edNotes[$i]['target'],
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $this->responseWithJson($response,['error' => ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE], 409);
            }
            if (!$dataManager->userManager->userExistsById($edNotes[$i]['authorId'])) {
                $this->logger->error("Inexisted author Id for editorial note: " . $edNotes[$i]['authorId'],
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_AUTHOR_ID,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $this->responseWithJson($response,['error' => ApiController::API_ERROR_WRONG_AUTHOR_ID], 409);
            }
            
        }
        $profiler->lap('Checks Done');
        $updateTime = MySqlUnitemporalDataTable::now();
        $this->logger->info("UPDATE elements", 
                            [ 'apiUserId' => $this->apiUserId,
                              'pageId' => $pageId,
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'updateTime' => $updateTime
                            ]);

        $newElements = DataManager::createElementArrayFromArray($newElementsArray);
        // Get the editorial notes
        $edNotes  = EdNoteManager::editorialNoteArrayFromArray($inputDataObject['ednotes'], $this->logger);

        
        $newItemIds = $dataManager->updateColumnElements($pageId, $columnNumber, $newElements, $updateTime);
        $profiler->lap('Elements Updated');
        // Update targets
        for ($i = 0; $i < count($edNotes); $i++) {
            $targetId = $edNotes[$i]->target;
            if (isset($newItemIds[$targetId])) {
                $edNotes[$i]->target = $newItemIds[$targetId];
            } else {
                // This should never happen!
                $this->logger->error('Editorial note without valid target Id: ' . $targetId, get_object_vars($edNotes[$i]));
            }
        }
        $this->debug("Updating ednotes", $edNotes);
        $dataManager->edNoteManager->updateNotesFromArray($edNotes);

        $versionId = $dataManager->registerTranscriptionVersion($pageId, $columnNumber, $updateTime,
            $this->apiUserId, $versionDescr, $versionIsMinor, $versionIsReview);
        if ($versionId === false) {
            $this->logger->error('Cannot register version');
        }
        
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
   
   
    public function getElementsByDocPageCol(Request $request, Response $response)
    {
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        $columnNumber = $request->getAttribute('column');
        $versionId = $request->getAttribute('version');

        $dataManager = $this->getDataManager();

        // Get a list of versions
        $pageId = $dataManager->getPageIdByDocPage($docId, $pageNumber);
        $versions = $dataManager->getTranscriptionVersionsWithAuthorInfo($pageId, $columnNumber);

        $versionTime = MySqlUnitemporalDataTable::now();
        if (count($versions) === 0) {
            $thisVersion = -1;
        } else {
            if (is_null($versionId)) {
                // no version Id in request means get the latest version
                $thisVersion = intval($versions[count($versions) - 1]['id']);
                $this->debug('No version requested, defaulting to last version, id = ' . $thisVersion);
            } else {
                // first, check that the version id requested is actually in this page/col versions
                $thisVersion = intval($versionId);
                $requestVersionIsAValidVersion = false;
                $versionIndex = 0;
                foreach($versions as $v) {
                    if (intval($v['id']) === $thisVersion) {
                        $requestVersionIsAValidVersion = true;
                        break;
                    }
                    $versionIndex++;
                }
                if (!$requestVersionIsAValidVersion) {
                    $this->logger->error("Requested version ID is not in this page/col versions",
                        [ 'apiUserId' => $this->apiUserId,
                            'apiError' => self::API_ERROR_INVALID_VERSION_REQUESTED,
                            'docId' => $docId,
                            'pageNumber' => $pageNumber,
                            'columnNumber' => $columnNumber,
                            'requestedVersion' => $thisVersion
                        ]);
                    return $this->responseWithJson($response,['error' => self::API_ERROR_INVALID_VERSION_REQUESTED], 409);
                }
                // version is good, let's get the time
                $versionTime = $versions[$versionIndex]['time_from'];
            }
        }

        // Get the elements
        $elements = $dataManager->getColumnElements($docId, $pageNumber,
            $columnNumber, $versionTime);

        // Get the editorial notes
        $ednotes = $dataManager->edNoteManager->getEditorialNotesByPageIdColWithTime($pageId, $columnNumber, $versionTime);
        
        $pageInfo = $dataManager->getPageInfoByDocPage($docId, $pageNumber);

        // Get the information about every person 
        // in the elements and editorial notes
        $people = [];
        foreach ($elements as $e){
            if (!isset($people[$e->editorId])){
                $people[$e->editorId] = 
                        $dataManager->userManager->getUserInfoByUserId($e->editorId);
            }
        }
        foreach($ednotes as $e){
            if (!isset($people[$e->authorId])){
                $people[$e->authorId] = 
                        $dataManager->userManager->getUserInfoByUserId($e->authorId);
            }
        }
        // Add API user info as well
        if (!isset($people[$this->apiUserId])){
            //print "API User ID: " . $this->userId . "\n";
            $people[$this->apiUserId] =
                    $dataManager->userManager->getUserInfoByUserId($this->apiUserId);
        }

        $this->logger->info("QUERY Page Data", [ 
            'apiUserId'=> $this->apiUserId,
            'col' => (int) $columnNumber,
            'docId' => $docId,
            'pageNumber' => $pageNumber,
            'pageId' => $pageInfo['id'],
            'versionId' => $thisVersion,
            'versionTime' => $versionTime
            ]);

        return $this->responseWithJson($response,['elements' => $elements,
            'ednotes' => $ednotes, 
            'people' => $people, 
            'info' => [
                'col' => (int) $columnNumber,
                'docId' => $pageInfo['doc_id'],
                'pageId' => $pageInfo['id'],
                'lang' => $pageInfo['lang'],
                'numCols' => $pageInfo['num_cols'],
                'versions' => $versions,
                'thisVersion' => $thisVersion
                ]
         ]);
   }
}
