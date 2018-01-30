<?php
/*
 * Copyright (C) 2016 Universität zu Köln
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
use AverroesProject\Profiler\Profiler;

/**
 * API Controller class
 *
 */
class ApiController
{
    protected $ci;
    private $logger;
    
    // Error codes
    const API_NO_ERROR = 0;
    const API_ERROR_NO_DATA = 1000;
    const API_ERROR_NO_ELEMENT_ARRAY = 1001;
    const API_ERROR_NO_EDNOTES = 1002;
    const API_ERROR_ZERO_ELEMENTS = 1003;
    const API_ERROR_MISSING_ELEMENT_KEY = 1004;
    const API_ERROR_WRONG_PAGE_ID = 1005;
    const API_ERROR_WRONG_COLUMN_NUMBER = 1006;
    const API_ERROR_WRONG_EDITOR_ID = 1007;
    const API_ERROR_EMPTY_ELEMENT = 1008;
    const API_ERROR_MISSING_ITEM_KEY = 1009;
    const API_ERROR_DUPLICATE_ITEM_ID = 1010;
    const API_ERROR_MISSING_EDNOTE_KEY = 1011;
    const API_ERROR_WRONG_TARGET_FOR_EDNOTE = 1012;
    const API_ERROR_WRONG_AUTHOR_ID = 1013;
    const API_ERROR_WRONG_DOCUMENT = 1014;
    const API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED = 1015;
    
    const API_ERROR_DB_UPDATE_ERROR = 1200;
            
    
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->logger = $ci->logger->withName('API');
    }
   
    public function generateMarkIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::markIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
     public function generateNoWordBreakIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::noWordBreakIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateIllegibleIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        $length = $request->getAttribute('length');
        
        $imageData = \AverroesProject\Image\EditorImages::illegibleIcon($size, $length);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
        //return $response;
    }
    
    public function generateChunkMarkIcon(Request $request, 
            Response $response, $next)
    {
        $dareId = $request->getAttribute('dareid');
        $chunkNumber = $request->getAttribute('chunkno');
        $type = $request->getAttribute('type');
        $size = $request->getAttribute('size');
        $dir = $request->getAttribute('dir');
        
        $imageData = \AverroesProject\Image\EditorImages::ChunkMarkIcon($size, $dareId, $chunkNumber, $type, $dir);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateLineGapImage(Request $request, 
            Response $response, $next)
    {
        $count = $request->getAttribute('count');
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::LineGapImage($size, $count);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateCharacterGapImage(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        $length = $request->getAttribute('length');
        
        $imageData = \AverroesProject\Image\EditorImages::CharacterGapImage($size, $length);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function generateParagraphMarkIcon(Request $request, 
            Response $response, $next)
    {
        $size = $request->getAttribute('size');
        
        $imageData = \AverroesProject\Image\EditorImages::paragraphMarkIcon($size);
        
        $response->getBody()->write($imageData);
        return $response->withHeader('Content-Type', 'image/png');
    }
    
    public function updateElementsByDocPageCol(Request $request, 
            Response $response, $next)
    {
        
        $profiler = new Profiler('updateElements', $this->db);
        
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
                      'apiError' => self::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_DATA]);
        }
        if (!isset($inputDataObject['elements']) ) {
            $this->logger->error("Input data array does not contain elements",
                    [ 'apiUserId' => $this->ci->userId, 
                       'apiError' => self::API_ERROR_NO_ELEMENT_ARRAY, 
                        'inputDataObject' => $inputDataObject
                    ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_ELEMENT_ARRAY]);
        }
        
        if (!isset($inputDataObject['ednotes']) ) {
            $this->logger->error("Input data array does not contain ednote array",
                    [ 'apiUserId' => $this->ci->userId, 
                       'apiError' => self::API_ERROR_NO_EDNOTES,  
                        'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_EDNOTES]);
        }
        
        if (count($inputDataObject['elements'])===0 ) {
            $this->logger->error("Empty element array to update column",
                    [ 'apiUserId' => $this->ci->userId, 
                       'apiError' => self::API_ERROR_ZERO_ELEMENTS,   
                        'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_ZERO_ELEMENTS]);
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
                      'apiError' => self::API_ERROR_MISSING_ELEMENT_KEY, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_MISSING_ELEMENT_KEY]);
                }
            }
            
            // check page Id
            if ($newElementsArray[$i]['pageId'] !== $pageId) {
                $this->logger->error("Element with wrong pageId in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_PAGE_ID, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_PAGE_ID]);
            }
           
            // check columnNumber
            if ($newElementsArray[$i]['columnNumber'] !== $columnNumber) {
                $this->logger->error("Element with wrong columnNumber in input array",
                    [ 'apiUserId' => $this->ci->userId,
                      'apiError' => self::API_ERROR_WRONG_COLUMN_NUMBER,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_COLUMN_NUMBER]);
            }
            // check EditorId
            if (!$this->db->um->userExistsById($newElementsArray[$i]['editorId'])) {
                $this->logger->error("Non existent editorId in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_EDITOR_ID,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_EDITOR_ID]);
            }
            
            // Check that there are items, no empty elements allowed
            if ($newElementsArray[$i]['type'] !== \AverroesProject\ColumnElement\Element::LINE_GAP &&  count($newElementsArray[$i]['items']) === 0) {
                $this->logger->error("Empty element in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                        'apiError' => self::API_ERROR_EMPTY_ELEMENT,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_EMPTY_ELEMENT]);
            }
            
            // Check that item data is complete
            // Force handId to 0 if not handId given
            // print "  Checking " . count($newElementsArray[$i]['items']) . " items for element $i\n";
            for ($j = 0; $j < count($newElementsArray[$i]['items']); $j++) {
                foreach ($requiredItemProperties as $reqKey) {
                    if (!array_key_exists($reqKey, $newElementsArray[$i]['items'][$j])) {
                        $this->logger->error("Missing key in item: " . $reqKey,
                            [ 'apiUserId' => $this->ci->userId, 
                              'apiError' => self::API_ERROR_MISSING_ITEM_KEY,
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'itemIndex' => $j,
                              'elementArray' => $newElementsArray[$i]
                            ]);
                        return $response->withStatus(409)->withJson(['error' => self::API_ERROR_MISSING_ITEM_KEY]);
                    }
                }
                $id = $newElementsArray[$i]['items'][$j]['id'];
                //print "Item ID = $id\n";
                if ($id !== -1) {
                    // Check for duplicate item Ids
                    if (isset($givenItemIds[$id])) {
                        $this->logger->error("Duplicate Item id : " . $id,
                        [ 'apiUserId' => $this->ci->userId,
                          'apiError' => self::API_ERROR_DUPLICATE_ITEM_ID,
                          'docId' => $docId,
                          'pageNumber' => $pageNumber,
                          'columnNumber' => $columnNumber,
                          'itemIndex' => $j,
                          'elementArray' => $newElementsArray[$i]
                        ]);
                        return $response->withStatus(409)->withJson(['error' => self::API_ERROR_DUPLICATE_ITEM_ID]);
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
                          'apiError' => self::API_ERROR_MISSING_EDNOTE_KEY,
                          'docId' => $docId,
                          'pageNumber' => $pageNumber,
                          'columnNumber' => $columnNumber,
                          'edNoteIndex' => $i,
                          'edNote' => $edNotes[$i]
                        ]);
                    return $response->withStatus(409)->withJson(['error' => self::API_ERROR_MISSING_EDNOTE_KEY]);
                }
            }
            if (!isset($givenItemIds[$edNotes[$i]['target']])) {
                $this->logger->error("Bad target for editorial note: " . $edNotes[$i]['target'],
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_TARGET_FOR_EDNOTE,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $response->withStatus(409)->withJson(['error' => self::API_ERROR_WRONG_TARGET_FOR_EDNOTE]);
            }
            if (!$this->db->um->userExistsById($edNotes[$i]['authorId'])) {
                $this->logger->error("Inexisted author Id for editorial note: " . $edNotes[$i]['authorId'],
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_WRONG_AUTHOR_ID,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $response->withStatus(409)->withJson(['error' => self::API_ERROR_WRONG_AUTHOR_ID]); 
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
    
    public function updatePageSettings(Request $request, Response $response, $next)
    {
        $profiler = new Profiler('updatePageSettings', $this->db);
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
        $profiler = new Profiler('deleteDocument', $this->db);
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
                      'apiError' => self::API_ERROR_WRONG_DOCUMENT, 
                      'docId' => $docId ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist']);
        }
        
        // Make sure the document is safe to delete
        $nPages = $this->ci->db->getPageCountByDocIdAllTime($docId);
        if ($nPages !== 0) {
            $this->logger->error("Delete document: document cannot be safely deleted",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 
                      'docId' => $docId, 
                      'pageCountAllTime' => $nPages]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_DOC_CANNOT_BE_SAFELY_DELETED, 'msg' => 'Document cannot be safely deleted']);
        }
        
        $result = $this->ci->db->deleteDocById($docId);
        if ($result === false) {
            $this->logger->error("Delete document: cannot delete",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_DB_UPDATE_ERROR,
                      'docId' => $docId]);
            return $response->withStatus(409)->withJson(['error' => self::API_ERROR_DB_UPDATE_ERROR, 'msg' => 'Database erorr']);
        }
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
    public function addPages(Request $request, Response $response, $next) 
    {
        $profiler = new Profiler('addPages', $this->db);
        
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
                      'apiError' => self::API_ERROR_WRONG_DOCUMENT, 
                      'docId' => $docId ]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_WRONG_DOCUMENT, 'msg' => 'Document does not exist']);
        }
        
        $rawData = $request->getBody()->getContents();
        $postData = [];
        parse_str($rawData, $postData);
        
        
        if (!isset($postData['numPages'])) {
            $this->logger->error("Add pages: no data in input",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_DATA]);
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
                      'apiError' => self::API_ERROR_DB_UPDATE_ERROR,
                      'curNumPages' => $curNumPages,
                      'requestedNewPages' => $numPages,
                      'pageNumberNotCreated' => $i
                    ]);
                return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_DB_UPDATE_ERROR]);
            }
        }
        
        $profiler->log($this->logger);
        return $response->withStatus(200);
    }
    
    public function newDocument(Request $request, Response $response, $next) 
    {
        $profiler = new Profiler('New Doc', $this->db);
        
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
                      'apiError' => self::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_DATA]);
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
                      'apiError' => self::API_ERROR_DB_UPDATE_ERROR,
                      'docSettings' => $docSettings]);
            return $response->withStatus(409)->withJson(['error' => self::API_ERROR_DB_UPDATE_ERROR]);
        }
        $profiler->log($this->logger);
        return $response->withStatus(200)->withJson(['newDocId' => $docId]);
        
    }
    
    public function updateDocSettings(Request $request, Response $response, $next)
    {
        $profiler = new Profiler('updateDocSettings', $this->db);
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
                      'apiError' => self::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_DATA]);
        }
        
        $dm = $this->db;
        $result = $dm->updateDocSettings($docId, $newSettings);
        if ($result === false) {
             $this->logger->error("Error writing new doc settings to DB",
                    [ 'apiUserId' => $this->ci->userId, 
                      'apiError' => self::API_ERROR,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_DB_UPDATE_ERROR]);
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
        $profiler = new Profiler('updatePageSettingsBulk', $this->db);
        
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
                      'apiError' => self::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $response->withStatus(409)->withJson( ['error' => self::API_ERROR_NO_DATA]);
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
   
    public function getUserProfileInfo(Request $request, Response $response, 
            $next)
    {
        $um = $this->db->um;
        $profiler = new \AverroesProject\Profiler\Profiler('getUserProfileInfo', $this->db);
        $profileUserId =  (int) $request->getAttribute('userId');
        $userProfileInfo = $um->getUserInfoByUserId($profileUserId);
        if ($userProfileInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $userProfileInfo['isroot'] = $um->isRoot($profileUserId);
        $profiler->log($this->logger);
        return $response->withJson($userProfileInfo);
    }
   
    public function updateUserProfile(Request $request, Response $response, 
            $next)
    {
        $um = $this->db->um;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $fullname = $postData['fullname'];
        $email = $postData['email'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
       
        if ($fullname == '') {
            $this->logger->warning("No fullname given", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && 
                !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to update "
                    . "$profileUserName's profile but she/he is not allowed", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => profileUserId]);
            return $response->withStatus(403);
        }
        if ($fullname === $profileUserInfo['fullname'] && 
                $email === $profileUserInfo['email']) {
            $this->logger->notice("$updater tried to update "
                    . "$profileUserName's profile, but without new information", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        if ($um->updateUserInfo($profileUserId, $fullname, $email) !== false) {
            
            $this->logger->info("$updater updated $profileUserName's "
                    . "profile with fullname '$fullname', email '$email'", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->error("Could not update user $profileUserId with "
                . "fullname '$fullname', email '$email'", 
                [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
        return $response->withStatus(409);       
    }
   
    public function changeUserPassword(Request $request, Response $response, 
           $next)
    {
        $um = $this->db->um;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $password1 = $postData['password1'];
        $password2 = $postData['password2'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        
        
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        $profileUserName = $profileUserInfo['username'];
         
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && 
                !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to changer "
                    . "$profileUserName's password but she/he is not allowed", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(403);
        }
        if ($password1 == '') {
             $this->logger->warning("Empty password for user "
                     . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user "
                    . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }

        if ($um->storeUserPassword($profileUserName, $password1)) {
            $this->logger->info("$updater changed "
                    . "$profileUserName's password", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->error("Error storing new password for "
                . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
        return $response->withStatus(409);
    }
    
    public function makeUserRoot(Request $request, Response $response, $next)
    {
        $um = $this->db->um;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $confirmroot = $postData['confirmroot'];

        if ($confirmroot !== 'on') {
            $this->logger->warning("No confirmation in make root request", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        $updater = $updaterInfo['username'];
        if (!$um->isRoot($updaterInfo['id'])) {
            $this->logger->warning("$updater tried to make $profileUserName "
                    . "root but she/he is not allowed", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(403);
        }
        
       if ($um->makeRoot($profileUserId)) {
            $this->logger->info("$updater gave root status to $profileUserName", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->error("Error making $profileUserName root, change "
                . "attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
        return $response->withStatus(409);
    }
    
    public function createNewUser(Request $request, Response $response, $next)
    {
        $um = $this->db->um;
        $postData = $request->getParsedBody();
        $username = $postData['username'];
        $fullname = $postData['fullname'];
        $email = $postData['email'];
        $password1 = $postData['password1'];
        $password2 = $postData['password2'];
        
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        if ($updaterInfo === false) {
            $this->logger->error("Can't read updater info from DB", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(404);
        }
        $updater = $updaterInfo['username'];
        
        if (!$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to create a user, "
                    . "but she/he is not allowed", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(401);
        }
        
        if ($username == '') {
            $this->logger->warning("No username given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        if ($fullname == '') {
            $this->logger->warning("No fullname given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        
        if ($password1 == '') {
            $this->logger->warning("No password given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        
        // Create the user
        if ($um->userExistsByUserName($username)) {
             $this->logger->error("$username already exists, "
                     . "creation attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        $newUserId = $um->createUserByUserName($username);
        if ($newUserId === false) {
            $this->logger->error("Can't create user $username, "
                    . "creation attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        
        // Try to update info, will not return an error to the user, but 
        // will log if there's any problem
        
        // Update the profile info
        if ($um->updateUserInfo($newUserId, $fullname, $email) === false) {
            $this->logger->error("Can't update info for user $username, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId , 
                     'userId' => $newUserId]);
            return $response->withStatus(200);
        }
        
        // Update password
        if (!$um->storeUserPassword($username, $password1)) {
            $this->logger->error("Can't change password for user $username, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId , 
                     'userId' => $newUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->info("$username successfully created by $updater", 
                    ['apiUserId' => $this->ci->userId , 
                     'userId' => $newUserId]);
        return $response->withStatus(200);
    }
}
