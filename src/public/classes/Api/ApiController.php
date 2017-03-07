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
   //Constructor
   public function __construct( $ci) {
       $this->ci = $ci;
       $this->db = $ci->db;
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
        $ednotes = $this->db->getEditorialNotesByDocPageCol($docId, $pageNumber, $columnNumber);

        if ($ednotes === NULL){
            $ednotes = [];
        }

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
   
   public function getNumColumns(Request $request, Response $response, $next){
        $docId = $request->getAttribute('document');
        $pageNumber = $request->getAttribute('page');
        
        $numColumns = $this->db->getNumColumns($docId, $pageNumber);
        
        return $response->withJson($numColumns);
   }
   
    public function updateUserProfile(Request $request, Response $response, $next){
        $um = $this->ci->um;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $fullname = $postData['fullname'];
        $email = $postData['email'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        
        if ($profileUserInfo === false ) {
            error_log("UPDATE_USER_PROFILE: Error getting info from user ID  $profileUserId");
            return $response->withStatus(409);
        }
       
        if ($fullname == '') {
            error_log("UPDATE_USER_PROFILE: Error: Empty fullname trying to update profile for user ID  $profileUserId");
            return $response->withStatus(409);
        }
        
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            error_log("UPDATE_USER_PROFILE: $updater tried to update $profileUserName's profile but she/he is not allowed");
            return $response->withStatus(403);
        }
        if ($fullname === $profileUserInfo['fullname'] and $email === $profileUserInfo['email']) {
            error_log("UPDATE_USER_PROFILE: $updater tried to updated user $profileUserName, but without new information");
            return $response->withStatus(200);
        }
        
        if ($um->updateUserInfo($profileUserId, $fullname, $email) !== false) {
            
            error_log("UPDATE_USER_PROFILE: $updater updated user $profileUserName with fullname '$fullname', email '$email'");
            return $response->withStatus(200);
        }
        
        error_log("UPDATE_USER_PROFILE: Error updating user $profileUserId with fullname '$fullname', email '$email'");
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
            error_log("CHANGE_USER_PASSWORD: Error getting info for user ID  $profileUserId");
            return $response->withStatus(409);
        }
        $profileUserName = $profileUserInfo['username'];
         
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            error_log("CHANGE_USER_PASSWORD: $updater tried to changer $profileUserName's password but she/he is not allowed");
            return $response->withStatus(403);
        }
        if ($password1 == '') {
             error_log("CHANGE_USER_PASSWORD: Empty password for user $profileUserName, change attempted by $updater");
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            error_log("CHANGE_USER_PASSWORD: Passwords do not match for user $profileUserName, change attempted by $updater");
            return $response->withStatus(409);
        }

        if ($um->storeUserPassword($profileUsername, $password1)) {
            error_log("CHANGE_USER_PASSWORD: $updater changed $profileUserName's password");
            return $response->withStatus(200);
        }
        
        error_log("CHANGE_USER_PASSWORD: Error storing new password for $profileUserName, change attempted by $updater");
        return $response->withStatus(409);
    }
    
    public function makeUserRoot(Request $request, Response $response, $next){
        $um = $this->ci->um;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $confirmroot = $postData['confirmroot'];

        if ($confirmroot !== 'on') {
            error_log("MAKE_USER_ROOT: no confirmation in request");
            return $response->withStatus(409);
        }
        
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        if ($profileUserInfo === false ) {
            error_log("MAKE_USER_ROOT: Error getting info for user ID  $profileUserId");
            return $response->withStatus(409);
        }
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->ci->userId);
        $updater = $updaterInfo['username'];
        if (!$um->isRoot($updaterInfo['id'])) {
            error_log("MAKE_USER_ROOT: $updater tried to make $profileUserName root but she/he is not allowed");
            return $response->withStatus(403);
        }
        
       if ($um->makeRoot($profileUserId)) {
            error_log("MAKE_USER_ROOT: $updater made $profileUserName root");
            return $response->withStatus(200);
        }
        
        error_log("MAKE_USER_ROOT: Error making $profileUserName root, change attempted by $updater");
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
            error_log("CREATE_NEW_USER: can't read updater info from DB");
            return $response->withStatus(404);
        }
        $updater = $updaterInfo['username'];
        
        if (!$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            error_log("CREATE_NEW_USER: $updater tried to create a user, but she/he is not allowed");
            return $response->withStatus(401);
        }
        
        if ($username == '') {
            error_log("CREATE_NEW_USER: no username given, change attempted by $updater");
            return $response->withStatus(409);
        }
        if ($fullname == '') {
            error_log("CREATE_NEW_USER: no fullname given, change attempted by $updater");
            return $response->withStatus(409);
        }
        
        if ($password1 == '') {
            error_log("CREATE_NEW_USER: no username given, change attempted by $updater");
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            error_log("CREATE_NEW_USER: Passwords do not match, change attempted by $updater");
            return $response->withStatus(409);
        }
        
        // Create the user
        $newUserId = $um->createUserByUserName($username);
        if ($newUserId === false) {
            error_log("CREATE_NEW_USER: can't create user $username, change attempted by $updater");
            return $response->withStatus(409);
        }
        
        // Try to update info, will not return an error, but will log if there's 
        // any problem
        
        // Update the profile info
        if ($um->updateUserInfo($newUserId, $fullname, $email) === false) {
            error_log("CREATE_NEW_USER: can't update info for user $username, change attempted by $updater");
            return $response->withStatus(200);
        }
        
        // Update password
        if (!$um->storeUserPassword($username, $password1)) {
            error_log("CREATE_NEW_USER: can't change password for user $username, change attempted by $updater");
            return $response->withStatus(200);
        }
        
        error_log("CREATE_NEW_USER: User $username successfully created by $updater");
        return $response->withStatus(200);
    }
}
