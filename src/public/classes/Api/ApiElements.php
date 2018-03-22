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
class ApiElements extends ApiController
{
    
    
    public function updateElementsByDocPageCol(Request $request, 
            Response $response, $next)
    {
        
        $profiler = new ApmProfiler('updateElements', $this->db);
        
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
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_DATA]);
        }
        if (!isset($inputDataObject['elements']) ) {
            $this->logger->error("Input data array does not contain elements",
                    [ 'apiUserId' => $this->ci->userId, 
                       'apiError' => ApiController::API_ERROR_NO_ELEMENT_ARRAY, 
                        'inputDataObject' => $inputDataObject
                    ]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_ELEMENT_ARRAY]);
        }
        
        if (!isset($inputDataObject['ednotes']) ) {
            $this->logger->error("Input data array does not contain ednote array",
                    [ 'apiUserId' => $this->ci->userId, 
                       'apiError' => ApiController::API_ERROR_NO_EDNOTES,  
                        'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_NO_EDNOTES]);
        }
        
        if (count($inputDataObject['elements'])===0 ) {
            $this->logger->error("Empty element array to update column",
                    [ 'apiUserId' => $this->ci->userId, 
                       'apiError' => ApiController::API_ERROR_ZERO_ELEMENTS,   
                        'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_ZERO_ELEMENTS]);
        }

        // Check elements and force hand Id on items
        $pageId = $this->db->getPageIdByDocPage($docId, $pageNumber);
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
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_MISSING_ELEMENT_KEY, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_MISSING_ELEMENT_KEY]);
                }
            }
            
            // check page Id
            if ($newElementsArray[$i]['pageId'] !== $pageId) {
                $this->logger->error("Element with wrong pageId in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_WRONG_PAGE_ID, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_WRONG_PAGE_ID]);
            }
           
            // check columnNumber
            if ($newElementsArray[$i]['columnNumber'] !== $columnNumber) {
                $this->logger->error("Element with wrong columnNumber in input array",
                    [ 'apiUserId' => $this->ci->userId,
                      'apiError' => ApiController::API_ERROR_WRONG_COLUMN_NUMBER,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_WRONG_COLUMN_NUMBER]);
            }
            // check EditorId
            if (!$this->db->um->userExistsById($newElementsArray[$i]['editorId'])) {
                $this->logger->error("Non existent editorId in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_WRONG_EDITOR_ID,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_WRONG_EDITOR_ID]);
            }
            
            // Check that there are items, no empty elements allowed
            if ($newElementsArray[$i]['type'] !== \AverroesProject\ColumnElement\Element::LINE_GAP &&  count($newElementsArray[$i]['items']) === 0) {
                $this->logger->error("Empty element in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                        'apiError' => ApiController::API_ERROR_EMPTY_ELEMENT,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => ApiController::API_ERROR_EMPTY_ELEMENT]);
            }
            
            // Check that item data is complete
            // Force handId to 0 if not handId given
            // print "  Checking " . count($newElementsArray[$i]['items']) . " items for element $i\n";
            for ($j = 0; $j < count($newElementsArray[$i]['items']); $j++) {
                foreach ($requiredItemProperties as $reqKey) {
                    if (!array_key_exists($reqKey, $newElementsArray[$i]['items'][$j])) {
                        $this->logger->error("Missing key in item: " . $reqKey,
                            [ 'apiUserId' => $this->ci->userId, 
                              'apiError' => ApiController::API_ERROR_MISSING_ITEM_KEY,
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'itemIndex' => $j,
                              'elementArray' => $newElementsArray[$i]
                            ]);
                        return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_MISSING_ITEM_KEY]);
                    }
                }
                $id = $newElementsArray[$i]['items'][$j]['id'];
                //print "Item ID = $id\n";
                if ($id !== -1) {
                    // Check for duplicate item Ids
                    if (isset($givenItemIds[$id])) {
                        $this->logger->error("Duplicate Item id : " . $id,
                        [ 'apiUserId' => $this->ci->userId,
                          'apiError' => ApiController::API_ERROR_DUPLICATE_ITEM_ID,
                          'docId' => $docId,
                          'pageNumber' => $pageNumber,
                          'columnNumber' => $columnNumber,
                          'itemIndex' => $j,
                          'elementArray' => $newElementsArray[$i]
                        ]);
                        return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_DUPLICATE_ITEM_ID]);
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
                        [ 'apiUserId' => $this->ci->userId, 
                          'apiError' => ApiController::API_ERROR_MISSING_EDNOTE_KEY,
                          'docId' => $docId,
                          'pageNumber' => $pageNumber,
                          'columnNumber' => $columnNumber,
                          'edNoteIndex' => $i,
                          'edNote' => $edNotes[$i]
                        ]);
                    return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_MISSING_EDNOTE_KEY]);
                }
            }
            if (!isset($givenItemIds[$edNotes[$i]['target']])) {
                $this->logger->error("Bad target for editorial note: " . $edNotes[$i]['target'],
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE]);
            }
            if (!$this->db->um->userExistsById($edNotes[$i]['authorId'])) {
                $this->logger->error("Inexisted author Id for editorial note: " . $edNotes[$i]['authorId'],
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => ApiController::API_ERROR_WRONG_AUTHOR_ID,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $response->withStatus(409)->withJson(['error' => ApiController::API_ERROR_WRONG_AUTHOR_ID]); 
            }
            
        }
        $profiler->lap('Checks Done');
        
        $this->logger->info("UPDATE elements", 
                            [ 'apiUserId' => $this->ci->userId, 
                              'pageId' => $pageId,
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                            ]);

        $newElements = \AverroesProject\Data\DataManager::createElementArrayFromArray($newElementsArray);
        // Get the editorial notes
        $edNotes  = \AverroesProject\Data\EdNoteManager::editorialNoteArrayFromArray($inputDataObject['ednotes']);
        
        $newItemIds = $this->ci->db->updateColumnElements($pageId, $columnNumber, $newElements);
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
        $this->ci->db->enm->updateNotesFromArray($edNotes);
        
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
   
   
    public function getElementsByDocPageCol(Request $request, 
            Response $response, $next)
    {
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        $columnNumber = $request->getAttribute('column');

        // Get the elements
        $elements = $this->db->getColumnElements($docId, $pageNumber, 
                $columnNumber);

        // Get the editorial notes
        $ednotes = $this->db->enm->getEditorialNotesByDocPageCol($docId, 
                $pageNumber, $columnNumber);
        
        $pageInfo = $this->db->getPageInfoByDocPage($docId, $pageNumber);

        // Get the information about every person 
        // in the elements and editorial notes
        $people = [];
        foreach ($elements as $e){
            if (!isset($people[$e->editorId])){
                $people[$e->editorId] = 
                        $this->db->um->getUserInfoByUserId($e->editorId);
            }
        }
        foreach($ednotes as $e){
            if (!isset($people[$e->authorId])){
                $people[$e->authorId] = 
                        $this->db->um->getUserInfoByUserId($e->authorId);
            }
        }
        // Add API user info as well
        if (!isset($people[$this->ci->userId])){
            //print "API User ID: " . $this->ci->userId . "\n";
            $people[$this->ci->userId] = 
                    $this->db->um->getUserInfoByUserId($this->ci->userId);
        }

        $this->logger->info("QUERY Page Data", [ 
            'apiUserId'=> $this->ci->userId, 
            'col' => (int) $columnNumber,
            'docId' => $docId,
            'pageNumber' => $pageNumber,
            'pageId' => $pageInfo['id']]);

        return $response->withJson(['elements' => $elements, 
            'ednotes' => $ednotes, 
            'people' => $people, 
            'info' => [
                'col' => (int) $columnNumber,
                'docId' => $pageInfo['doc_id'],
                'pageId' => $pageInfo['id'],
                'lang' => $pageInfo['lang'],
                'numCols' => $pageInfo['num_cols']
                ]
         ]);
   }
}
