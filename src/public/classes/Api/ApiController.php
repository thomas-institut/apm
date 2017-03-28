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
   public function __construct( $ci) {
       $this->ci = $ci;
       $this->db = $ci->db;
       $this->logger = $ci->logger->withName('API');
   }
   
   public function getElementsByDocPageCol(Request $request, Response $response, $next){
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        $columnNumber = $request->getAttribute('column');

        // Get the elements
        $elements = $this->db->getColumnElements($docId, $pageNumber, $columnNumber);
        if ($elements === NULL){
            $elements = [];
        }
        // Get the editorial notes
        $ednotes = $this->db->enm->getEditorialNotesByDocPageCol($docId, $pageNumber, $columnNumber);

        // Get the information about every person in the elements and editorial notes
        $people = [];
        foreach($elements as $e){
            if (!isset($people[$e->editorId])){
                $people[$e->editorId] = $this->ci->um->getUserInfoByUserId($e->editorId);
            }
        }
        foreach($ednotes as $e){
            if (!isset($people[$e->authorId])){
                $people[$e->authorId] = $this->ci->um->getUserInfoByUserId($e->authorId);
            }
        }

        return $response->withJson(['elements' => $elements, 
            'ednotes' => $ednotes, 
            'people' => $people, 
            'info' => ['col' => (int) $columnNumber]]);
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
        $updaterInfo = $this->ci->um->getUserInfoByUserId($this->ci->userId);
        $userName = $updaterInfo['username'];
        $this->logger->info("$userName added a column to " . 
                "doc $docId, page $pageNumber", 
                ['apiUserId' => $this->ci->userId]);
        
        return $response->withJson($numColumns);
   }
   
    public function getUserProfileInfo(Request $request, Response $response, $next){
        $um = $this->ci->um;
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
   
    public function updateUserProfile(Request $request, Response $response, $next){
        $um = $this->ci->um;
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
        if ($updater != $profileUserName && !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to update $profileUserName's profile but she/he is not allowed", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => profileUserId]);
            return $response->withStatus(403);
        }
        if ($fullname === $profileUserInfo['fullname'] and $email === $profileUserInfo['email']) {
            $this->logger->notice("$updater tried to update $profileUserName's profile, but without new information", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        if ($um->updateUserInfo($profileUserId, $fullname, $email) !== false) {
            
            $this->logger->info("$updater updated $profileUserName's profile with fullname '$fullname', email '$email'", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->error("Could not update user $profileUserId with fullname '$fullname', email '$email'", 
                [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
        return $response->withStatus(409);       
   }
   
   public function changeUserPassword(Request $request, Response $response, $next){
        $um = $this->ci->um;
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
        if ($updater != $profileUserName && !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to changer $profileUserName's password but she/he is not allowed", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(403);
        }
        if ($password1 == '') {
             $this->logger->warning("Empty password for user $profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user $profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }

        if ($um->storeUserPassword($profileUserName, $password1)) {
            $this->logger->info("$updater changed $profileUserName's password", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->error("Error storing new password for $profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
        return $response->withStatus(409);
    }
    
    public function makeUserRoot(Request $request, Response $response, $next){
        $um = $this->ci->um;
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
            $this->logger->warning("$updater tried to make $profileUserName root but she/he is not allowed", 
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
        
        $this->logger->error("Error making $profileUserName root, change attempted by $updater", 
                    [ 'apiUserId' => $this->ci->userId, 
                      'userId' => $profileUserId]);
        return $response->withStatus(409);
    }
    
    public function createNewUser(Request $request, Response $response, $next){
        $um = $this->ci->um;
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
            $this->logger->warning("$updater tried to create a user, but she/he is not allowed", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(401);
        }
        
        if ($username == '') {
            $this->logger->warning("No username given for user creation, change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        if ($fullname == '') {
            $this->logger->warning("No fullname given for user creation, change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        
        if ($password1 == '') {
            $this->logger->warning("No password given for user creation, change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user creation, change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        
        // Create the user
        if ($um->userExistsByUserName($username)) {
             $this->logger->error("$username already exists, creation attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        $newUserId = $um->createUserByUserName($username);
        if ($newUserId === false) {
            $this->logger->error("Can't create user $username, creation attempted by $updater", 
                    ['apiUserId' => $this->ci->userId]);
            return $response->withStatus(409);
        }
        
        // Try to update info, will not return an error to the user, but will log if there's 
        // any problem
        
        // Update the profile info
        if ($um->updateUserInfo($newUserId, $fullname, $email) === false) {
            $this->logger->error("Can't update info for user $username, change attempted by $updater", 
                    ['apiUserId' => $this->ci->userId , 
                     'userId' => $newUserId]);
            return $response->withStatus(200);
        }
        
        // Update password
        if (!$um->storeUserPassword($username, $password1)) {
            $this->logger->error("Can't change password for user $username, change attempted by $updater", 
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
