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

/**
 * API Controller class
 *
 */
class ApiController
{
    protected $ci;
    private $logger;
    
    //Constructor
    public function __construct( $ci)
    {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->logger = $ci->logger->withName('API-TEST');
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
    
    public function updateElementsByDocPageCol(Request $request, 
            Response $response, $next)
    {
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        $columnNumber = $request->getAttribute('column');
        $rawData = $request->getBody()->getContents();
        parse_str($rawData, $postData);
        $inputDataObject = null;
        
        if (isset($postData['data'])) {
            $inputDataObject = json_decode($postData['data'], true);
        }
        
        // Some checks: all required arrays, data with given docId, pageNo and colNumber
        if (is_null($inputDataObject) ) {
            $this->logger->error("Element update: no data in input",
                    [ 'apiUserId' => $this->ci->userId, 'data' => $postData]);
            return $response->withStatus(409);
        }
        if (!isset($inputDataObject['elements']) ) {
            $this->logger->error("Input data array does not contain elements",
                    [ 'apiUserId' => $this->ci->userId, 'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409);
        }
        
        if (!isset($inputDataObject['ednotes']) ) {
            $this->logger->error("Input data array does not contain ednote array",
                    [ 'apiUserId' => $this->ci->userId, 'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409);
        }
        
        if (count($inputDataObject['elements'])===0 ) {
            $this->logger->error("Empty element array to update column",
                    [ 'apiUserId' => $this->ci->userId, 'inputDataObject' => $inputDataObject]);
            return $response->withStatus(409);
        }
        
        
        // Check elements and force hand Id on items
        $pageId = $this->db->getPageIdByDocPage($docId, $pageNumber);
        $newElementsArray = $inputDataObject['elements'];
        
        $requiredElementKeys = ['id', 'pageId', 'columnNumber', 'seq' , 'lang', 'handId', 'editorId', 'type', 'items', 'reference', 'placement'];
        $requiredItemProperties = ['id', 'type', 'seq', 'lang', 'theText', 'altText', 'extraInfo', 'target', 'columnElementId'];
        $givenItemIds = [];
        
        for ($i = 0; $i < count($newElementsArray); $i++) {
            // Check that all object properties are present
            foreach ($requiredElementKeys as $reqKey) {
                if (!array_key_exists($reqKey, $newElementsArray[$i])) {
                     $this->logger->error("Missing key in element: " . $reqKey,
                    [ 'apiUserId' => $this->ci->userId, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409);
                }
            }
            
            // check page Id
            if ($newElementsArray[$i]['pageId'] !== $pageId) {
                $this->logger->error("Element with wrong pageId in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409);
            }
           
            // check columnNumber
            if ($newElementsArray[$i]['columnNumber'] !== $columnNumber) {
                $this->logger->error("Element with wrong columnNumber in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409);
            }
            // check EditorId
            if (!$this->db->um->userExistsById($newElementsArray[$i]['editorId'])) {
                $this->logger->error("Non existent editorId in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409);
            }
            
            // Check that there are items, no empty elements allowed
            if (count($newElementsArray[$i]['items']) === 0) {
                $this->logger->error("Empty element in input array",
                    [ 'apiUserId' => $this->ci->userId, 
                      'docId' => $docId,
                      'pageNumber' => $pageNumber,
                      'columnNumber' => $columnNumber,
                      'elementArray' => $newElementsArray[$i]
                ]);
                return $response->withStatus(409);
            }
            
            // Check that item data is complete
            // Force handId to 0
            for ($j = 0; $j < count($newElementsArray[$i]['items']); $j++) {
                foreach ($requiredItemProperties as $reqKey) {
                    if (!array_key_exists($reqKey, $newElementsArray[$i]['items'][$j])) {
                        $this->logger->error("Missing key in item: " . $reqKey,
                            [ 'apiUserId' => $this->ci->userId, 
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'itemIndex' => $j,
                              'elementArray' => $newElementsArray[$i]
                            ]);
                        return $response->withStatus(409);
                    }
                    $id = $newElementsArray[$i]['items'][$j]['id'];
                    if ($id !== -1) {
                        // Check for duplicate item Ids
                        if (isset($givenItemIds[$id])) {
                            $this->logger->error("Duplicate Item id : " . $id,
                            [ 'apiUserId' => $this->ci->userId, 
                              'docId' => $docId,
                              'pageNumber' => $pageNumber,
                              'columnNumber' => $columnNumber,
                              'itemIndex' => $j,
                              'elementArray' => $newElementsArray[$i]
                            ]);
                            return $response->withStatus(409);
                        }
                        $givenItemIds[$id] = true;
                    }
                }
                $newElementsArray[$i]['items'][$j]['handId'] = 0;
            }
        }
        $newElements = \AverroesProject\Data\DataManager::createElementArrayFromArray($newElementsArray);

        $newItemIds = $this->ci->db->updateColumnElements($pageId, $columnNumber, $newElements);

        // Get the editorial notes
        $edNotes  = \AverroesProject\Data\EdNoteManager::editorialNoteArrayFromArray($inputDataObject['ednotes']);
        // Update targets
        for ($i = 0; $i < count($edNotes); $i++) {
            $targetId = $edNotes[$i]->target;
            if (isset($newItemsIds[$targetId])) {
                $edNotes[$i]->target = $targetId;
            } else {
                $this->logger->warning('Editorial note without valid target Id');
            }
        }
        
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
            $people[$this->ci->userId] = 
                    $this->db->um->getUserInfoByUserId($this->ci->userId);
        }


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
        $profileUserId =  (int) $request->getAttribute('userId');
        $userProfileInfo = $um->getUserInfoByUserId($profileUserId);
        if ($userProfileInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $userProfileInfo['isroot'] = $um->isRoot($profileUserId);
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
