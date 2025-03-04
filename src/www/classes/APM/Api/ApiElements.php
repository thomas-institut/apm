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

use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Person\PersonNotFoundException;
use APM\System\Transcription\ApmTranscriptionManager;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\ColumnVersionInfo;
use APM\System\Transcription\EdNoteManager;
use APM\System\User\UserTag;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;
use ThomasInstitut\DataTable\InvalidTimeStringException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\TimeString;

/**
 * API Controller class
 *
 */
class ApiElements extends ApiController
{

    const string CLASS_NAME = 'TranscriptionElements';

    const int API_ERROR_INVALID_VERSION_REQUESTED = 5001;

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function updateElementsByDocPageCol(Request $request, Response $response): Response
    {

        $txManager = $this->systemManager->getTranscriptionManager();
        $docManager = $this->systemManager->getDocumentManager();

        $userManager = $this->systemManager->getUserManager();
         
        if ($userManager->hasTag($this->apiUserId, UserTag::READ_ONLY)) {
            $this->logger->error("User is not authorized to update elements",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NOT_AUTHORIZED,
                    ]);
            return $this->responseWithJson($response,
                    ['error' => ApiController::API_ERROR_NOT_AUTHORIZED,
                     'msg' => 'User is not allowed to save'
                    ], 409);
        }
        
        
        $docId = intval($request->getAttribute('document'));
        $pageNumber = intval($request->getAttribute('page'));
        $columnNumber = intval($request->getAttribute('column'));
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . "$docId:$pageNumber:$columnNumber");
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputDataObject = null;

        if (isset($postData['data'])) {
            $inputDataObject = json_decode($postData['data'], true);
        }

        $this->logger->debug("Input element data", $inputDataObject);
        
        // Some checks: all required arrays, data with given docId, pageNo and colNumber
        if (is_null($inputDataObject) ) {
            $this->logger->error("Element update: no data in input",
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_NO_DATA,
                      'data' => $postData]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_DATA], 409);
        }
        if (!isset($inputDataObject['elements']) ) {
            $this->logger->error("Input data array does not contain elements",
                    [ 'apiUserTid' => $this->apiUserId,
                       'apiError' => ApiController::API_ERROR_NO_ELEMENT_ARRAY, 
                        'inputDataObject' => $inputDataObject
                    ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_ELEMENT_ARRAY], 409);
        }
        
        if (!isset($inputDataObject['ednotes']) ) {
            $this->logger->error("Input data array does not contain ednote array",
                    [ 'apiUserTid' => $this->apiUserId,
                       'apiError' => ApiController::API_ERROR_NO_EDNOTES,  
                        'inputDataObject' => $inputDataObject]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_NO_EDNOTES], 409);
        }
        
        if (count($inputDataObject['elements'])===0 ) {
            $this->logger->error("Empty element array to update column",
                    [ 'apiUserTid' => $this->apiUserId,
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

        // Check elements and force hand ID on items
        $pageId = $docManager->getPageIdByDocPage($docId, $pageNumber);
        $newElementsArray = $inputDataObject['elements'];
        $edNotes = $inputDataObject['ednotes'];
        
        $requiredElementKeys = ['id', 'pageId', 'columnNumber', 'seq' , 'lang', 'handId', 'editorTid', 'type', 'items', 'reference', 'placement'];
        $requiredItemProperties = ['id', 'type', 'seq', 'lang', 'theText', 'altText', 'extraInfo', 'target', 'columnElementId'];
        $requiredEdNoteKeys = ['id', 'type', 'target', 'authorTid', 'text'];
        $givenItemIds = [];
        
        //print "Checking " . count($newElementsArray) . " elements\n";
        for ($i = 0; $i < count($newElementsArray); $i++) {
            // Check that all object properties are present
            foreach ($requiredElementKeys as $reqKey) {
                if (!array_key_exists($reqKey, $newElementsArray[$i])) {
                     $this->logger->error("Missing key in element: " . $reqKey,
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_MISSING_ELEMENT_KEY, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_MISSING_ELEMENT_KEY], 409);
                }
            }
            
            // check page ID
            if ($newElementsArray[$i]['pageId'] !== $pageId) {
                $this->logger->error("Element with wrong pageId in input array",
                    [ 'apiUserTid' => $this->apiUserId,
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
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_COLUMN_NUMBER,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_WRONG_COLUMN_NUMBER], 409);
            }
            // check EditorId
            if (!$userManager->isUser($newElementsArray[$i]['editorTid'])) {
                $this->logger->error("Non existent editorId in input array",
                    [ 'apiUserTid' => $this->apiUserId,
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
                    [ 'apiUserTid' => $this->apiUserId,
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
                            [ 'apiUserTid' => $this->apiUserId,
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
                        [ 'apiUserTid' => $this->apiUserId,
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
                        [ 'apiUserTid' => $this->apiUserId,
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
                    [ 'apiUserTid' => $this->apiUserId,
                      'apiError' => ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE,
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'edNoteIndex' => $i,
                      'edNote' => $edNotes[$i]
                    ]);
                return $this->responseWithJson($response,['error' => ApiController::API_ERROR_WRONG_TARGET_FOR_EDNOTE], 409);
            }
            if (!$userManager->isUser($edNotes[$i]['authorTid'])) {
                $this->logger->error("Nonexistent author Tid for editorial note: " . $edNotes[$i]['authorTid'],
                    [ 'apiUserTid' => $this->apiUserId,
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
        $updateTime = TimeString::now();
        $this->logger->info("UPDATE elements", 
                            [ 'apiUserTid' => $this->apiUserId,
                              'pageId' => $pageId,
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'updateTime' => $updateTime
                            ]);

        $newElements = ApmTranscriptionManager::createElementArrayFromArray($newElementsArray);
        // Get the editorial notes
        $edNotes  = EdNoteManager::buildEdNoteArrayFromInputArray($inputDataObject['ednotes'], $this->logger);

        $newItemIds = $txManager->updateColumnElements($pageId, $columnNumber, $newElements, $updateTime);
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
//        $this->debug("Updating ednotes", $edNotes);
        $txManager->getEdNoteManager()->updateNotesFromArray($edNotes);

        // Register version
        $versionInfo = new ColumnVersionInfo();
        $versionInfo->pageId = $pageId;
        $versionInfo->column = $columnNumber;
        $versionInfo->authorTid = $this->apiUserId;
        $versionInfo->description = $versionDescr;
        $versionInfo->isMinor = $versionIsMinor;
        $versionInfo->isReview = $versionIsReview;
        $versionInfo->timeFrom = $updateTime;

        try {
            $this->systemManager->getTranscriptionManager()->getColumnVersionManager()->registerNewColumnVersion($pageId, $columnNumber, $versionInfo);
        } catch (Exception $e) {
            $this->logger->error("Cannot register version: " . $e->getMessage());
        }

        $this->systemManager->onTranscriptionUpdated($this->apiUserId, $docId, $pageNumber, $columnNumber);
        return $this->responseWithStatus($response, 200);
    }


    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws PersonNotFoundException
     * @throws InvalidTimeStringException
     */
    public function getElementsByDocPageCol(Request $request, Response $response): Response
    {

        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        $columnNumber = $request->getAttribute('column');
        $versionId = $request->getAttribute('version');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":$docId:$pageNumber:$columnNumber");

        $docManager = $this->systemManager->getDocumentManager();
        $txManager = $this->systemManager->getTranscriptionManager();

        $docId = Tid::fromString($docId);

        // Get a list of versions
        try {
            $pageId = $docManager->getPageIdByDocPage($docId, $pageNumber);
        } catch (DocumentNotFoundException) {
            return $this->responseWithJson($response,['error' => self::API_ERROR_WRONG_DOCUMENT], 409);
        } catch(PageNotFoundException) {
            return $this->responseWithJson($response,['error' => self::API_ERROR_WRONG_PAGE_ID], 409);
        }

        $versionInfoArray = $txManager->getColumnVersionManager()->getColumnVersionInfoByPageCol($pageId, $columnNumber);

        $versionTime = TimeString::now();
        if (count($versionInfoArray) === 0) {
            $thisVersion = -1;
        } else {
            if (is_null($versionId)) {
                // no version ID in request means get the latest version
                $thisVersion = $versionInfoArray[count($versionInfoArray)-1]->id;
                $this->debug('No version requested, defaulting to last version, id = ' . $thisVersion);
            } else {
                // first, check that the version id requested is actually in this page/col versions
                $thisVersion = intval($versionId);
                $requestVersionIsAValidVersion = false;
                $versionIndex = 0;
                foreach($versionInfoArray as $v) {
                    if ($v->id === $thisVersion) {
                        $requestVersionIsAValidVersion = true;
                        break;
                    }
                    $versionIndex++;
                }
                if (!$requestVersionIsAValidVersion) {
                    $this->logger->error("Requested version ID is not in this page/col versions",
                        [ 'apiUserTid' => $this->apiUserId,
                            'apiError' => self::API_ERROR_INVALID_VERSION_REQUESTED,
                            'docId' => $docId,
                            'pageNumber' => $pageNumber,
                            'columnNumber' => $columnNumber,
                            'requestedVersion' => $thisVersion
                        ]);
                    return $this->responseWithJson($response,['error' => self::API_ERROR_INVALID_VERSION_REQUESTED], 409);
                }
                // version is good, let's get the time
                $versionTime = $versionInfoArray[$versionIndex]->timeFrom;
            }
        }

        // Get the elements
        $elements = $txManager->getColumnElementsByPageId($pageId, $columnNumber, $versionTime);

        // Get the editorial notes
        $ednotes = $txManager->getEdNoteManager()->getEditorialNotesByPageIdColWithTime($pageId, $columnNumber, $versionTime);

        try {
            $pageInfo = $docManager->getPageInfo($pageId);
        } catch (PageNotFoundException) {
            // should never happen!
            throw new RuntimeException("Page $pageId not found getting page Info");
        }

        // Get the information about every person 
        // in the elements and editorial notes
        $people = [];
        foreach ($elements as $e){
            if (!isset($people[$e->editorTid])){
                $people[$e->editorTid] =
                    $this->systemManager->getPersonManager()->getPersonEssentialData($e->editorTid)->getExportObject();
            }
        }
        foreach($ednotes as $e){
            if (!isset($people[$e->authorTid])){
                $people[$e->authorTid] =
                    $this->systemManager->getPersonManager()->getPersonEssentialData($e->authorTid)->getExportObject();
            }
        }
        // Add API user info as well
        if (!isset($people[$this->apiUserId])){
            $people[$this->apiUserId] =
                $this->systemManager->getPersonManager()->getPersonEssentialData($this->apiUserId)->getExportObject();
        }

        $versionData = $this->getVersionDataWithAuthorInfo($versionInfoArray);

        $this->logger->info("QUERY Page Data", [ 
            'apiUserTid'=> $this->apiUserId,
            'col' => (int) $columnNumber,
            'docId' => $docId,
            'pageNumber' => $pageNumber,
            'pageId' => $pageId,
            'versionId' => $thisVersion,
            'versionTime' => $versionTime
            ]);

        return $this->responseWithJson($response,['elements' => $elements,
            'ednotes' => $ednotes, 
            'people' => $people, 
            'info' => [
                'col' => (int) $columnNumber,
                'docId' => $pageInfo->docId,
                'pageId' => $pageId,
                'lang' => $pageInfo->lang,
                'numCols' => $pageInfo->numCols,
                'versions' => $versionData,
                'thisVersion' => $thisVersion
                ]
         ]);
   }


    /**
     * Returns an array of legacy version data elements from an
     * array of ColumnVersion
     * @param ColumnVersionInfo[] $versionInfoArray
     * @return array
     */
    private function getVersionDataWithAuthorInfo(array $versionInfoArray): array
    {
        $authorIds = [];
        foreach ($versionInfoArray as $versionInfo){
            if (!in_array($versionInfo->authorTid, $authorIds)){
                $authorIds[] = $versionInfo->authorTid;
            }
        }
        $authorData = [];
        $pm = $this->systemManager->getPersonManager();
        foreach($authorIds as $authorId) {
            try {
                $authorData[$authorId] = $pm->getPersonEssentialData($authorId);
            } catch (PersonNotFoundException) {
                throw new RuntimeException("Person $authorId not found");
            }
        }
        $dataArray = [];
        for ($i = 0; $i < count($versionInfoArray); $i++) {
            $versionInfo = $versionInfoArray[$i];
            $data = $this->getLegacyVersionData($versionInfo);
            $data['author_name'] = $authorData[$versionInfo->authorTid]->name;
            $data['author_username'] = $authorData[$versionInfo->authorTid]->userName;
            $data['number'] = $i + 1;
            $dataArray[] = $data;
        }
        return $dataArray;
    }

   private function getLegacyVersionData(ColumnVersionInfo $versionInfo) : array {
        return [
            'id' => $versionInfo->id,
            'page_id' => $versionInfo->pageId,
            'col' => $versionInfo->column,
            'time_from'=> $versionInfo->timeFrom,
            'time_until' => $versionInfo->timeUntil,
            'author_tid' => $versionInfo->authorTid,
            'descr' => $versionInfo->description,
            'minor' => $versionInfo->isMinor,
            'review' => $versionInfo->isReview,
            'is_published' => $versionInfo->isPublished,
        ];
   }
}
