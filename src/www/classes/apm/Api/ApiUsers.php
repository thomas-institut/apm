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

use APM\System\DataRetrieveHelper;
use DI\DependencyException;
use DI\NotFoundException;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

/**
 * API Controller class
 *
 */
class ApiUsers extends ApiController
{
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getUserProfileInfo(Request $request, Response $response): Response
    {
        $um = $this->getDataManager()->userManager;
        $apiCall = 'getUserProfileInfo';
        $this->profiler->start();

        $profileUserId =  (int) $request->getAttribute('userId');
        $userProfileInfo = $um->getUserInfoByUserId($profileUserId);
        if ($userProfileInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $userProfileInfo['isroot'] = $um->isRoot($profileUserId);
        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        return $this->responseWithJson($response,$userProfileInfo);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function updateUserProfile(Request $request, Response $response)
    {
        $um = $this->getDataManager()->userManager;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $fullname = $postData['fullname'];
        $email = $postData['email'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);

        $apiCall = 'updateUserProfile' . $profileUserId;
        $this->profiler->start();
        
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
       
        if ($fullname == '') {
            $this->logger->warning("No fullname given", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->apiUserId);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && 
                !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to update "
                    . "$profileUserName's profile but she/he is not allowed", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(403);
        }
        if ($fullname === $profileUserInfo['fullname'] && 
                $email === $profileUserInfo['email']) {
            $this->logger->notice("$updater tried to update "
                    . "$profileUserName's profile, but without new information", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        if ($um->updateUserInfo($profileUserId, $fullname, $email) !== false) {
            
            $this->logger->info("$updater updated $profileUserName's "
                    . "profile with fullname '$fullname', email '$email'", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        
        $this->logger->error("Could not update user $profileUserId with "
                . "fullname '$fullname', email '$email'", 
                [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
        return $response->withStatus(409);       
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function changeUserPassword(Request $request, Response $response)
    {
        $um = $this->getDataManager()->userManager;
        $this->profiler->start();

        $profileUserId =  (int) $request->getAttribute('userId');
        $apiCall = 'ChangeUserPassword-' . $profileUserId;
        $postData = $request->getParsedBody();
        $password1 = $postData['password1'];
        $password2 = $postData['password2'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        $profileUserName = $profileUserInfo['username'];


        $updaterInfo = $um->getUserInfoByUserId($this->apiUserId);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && 
                !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to changer "
                    . "$profileUserName's password but she/he is not allowed", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(403);
        }
        if ($password1 == '') {
             $this->logger->warning("Empty password for user "
                     . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user "
                    . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }

        if ($um->storeUserPassword($profileUserName, $password1)) {
            $this->profiler->stop();
            $this->logProfilerData($apiCall);
            $this->logger->info("$updater changed "
                    . "$profileUserName's password", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }

        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        $this->logger->error("Error storing new password for "
                . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
        return $response->withStatus(409);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function makeUserRoot(Request $request, Response $response)
    {
        $um = $this->getDataManager()->userManager;
        $profileUserId =  (int) $request->getAttribute('userId');
        $postData = $request->getParsedBody();
        $confirmroot = $postData['confirmroot'];

        if ($confirmroot !== 'on') {
            $this->logger->warning("No confirmation in make root request", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(409);
        }
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->apiUserId);
        $updater = $updaterInfo['username'];
        if (!$um->isRoot($updaterInfo['id'])) {
            $this->logger->warning("$updater tried to make $profileUserName "
                    . "root but she/he is not allowed", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(403);
        }
        
       if ($um->makeRoot($profileUserId)) {
            $this->logger->info("$updater gave root status to $profileUserName", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->error("Error making $profileUserName root, change "
                . "attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
        return $response->withStatus(409);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function createNewUser(Request $request, Response $response)
    {
        $um = $this->getDataManager()->userManager;
        $postData = $request->getParsedBody();
        $username = $postData['username'];
        $fullname = $postData['fullname'];
        $email = $postData['email'];
        $password1 = $postData['password1'];
        $password2 = $postData['password2'];
        
        $updaterInfo = $um->getUserInfoByUserId($this->apiUserId);
        if ($updaterInfo === false) {
            $this->logger->error("Can't read updater info from DB", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(404);
        }
        $updater = $updaterInfo['username'];
        
        if (!$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to create a user, "
                    . "but she/he is not allowed", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(401);
        }
        
        if ($username == '') {
            $this->logger->warning("No username given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(409);
        }
        if ($fullname == '') {
            $this->logger->warning("No fullname given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(409);
        }
        
        if ($password1 == '') {
            $this->logger->warning("No password given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(409);
        }
        
        // Create the user
        if ($um->userExistsByUserName($username)) {
             $this->logger->error("$username already exists, "
                     . "creation attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(409);
        }
        $newUserId = $um->createUserByUserName($username);
        if ($newUserId === false) {
            $this->logger->error("Can't create user $username, "
                    . "creation attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $response->withStatus(409);
        }
        
        // Try to update info, will not return an error to the user, but 
        // will log if there's any problem
        
        // Update the profile info
        if ($um->updateUserInfo($newUserId, $fullname, $email) === false) {
            $this->logger->error("Can't update info for user $username, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId ,
                     'userId' => $newUserId]);
            return $response->withStatus(200);
        }
        
        // Update password
        if (!$um->storeUserPassword($username, $password1)) {
            $this->logger->error("Can't change password for user $username, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId ,
                     'userId' => $newUserId]);
            return $response->withStatus(200);
        }
        
        $this->logger->info("$username successfully created by $updater", 
                    ['apiUserId' => $this->apiUserId ,
                     'userId' => $newUserId]);
        return $response->withStatus(200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getTranscribedPages(Request $request, Response $response) : Response
    {
        $apiCall = 'getTranscribedPages';
        $this->profiler->start();

        $dm = $this->getDataManager();
        $docManager = $this->systemManager->getTranscriptionManager()->getDocManager();
        $pageManager = $this->systemManager->getTranscriptionManager()->getPageManager();

        $helper = new DataRetrieveHelper();
        $helper->setLogger($this->logger);

        $userId =  (int) $request->getAttribute('userId');
        $docIds = $dm->getDocIdsTranscribedByUser($userId);
        $docInfoArray = $helper->getDocInfoArrayFromList($docIds, $docManager);
        $allPageIds = [];

        foreach($docIds as $docId) {
            $pageIds = $dm->getPageIdsTranscribedByUser($userId, $docId);
            $docInfoArray[$docId]->pageIds = $pageIds;
            foreach($pageIds as $pageId) {
                $allPageIds[] = $pageId;
            }
        }

        $pageInfoArray = $helper->getPageInfoArrayFromList($allPageIds, $pageManager);


        $data = [
            'docIds' => $docIds,
            'docInfoArray' => $docInfoArray,
            'pageInfoArray' => $pageInfoArray
        ];

        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        return $this->responseWithJson($response, $data);
    }


    public function getCollationTableInfo(Request $request, Response $response) : Response {
        $apiCall = 'getCollationTableInfo';
        $this->profiler->start();
        $userId =  (int) $request->getAttribute('userId');

        $ctManager = $this->systemManager->getCollationTableManager();
        $tableIds = $ctManager->getCollationTableVersionManager()->getActiveCollationTableIdsForUserId($userId);
        $tableInfo = [];
        foreach($tableIds as $tableId) {
            try {
                $ctData = $ctManager->getCollationTableById($tableId);
            } catch(InvalidArgumentException $e) {
                $this->logger->error("Table $tableId reported as being active does not exist. Is version table consistent?");
                continue;
            }
            if ($ctData['archived']) {
                continue;
            }
            $chunkId = $ctData['chunkId'] ?? $ctData['witnesses'][0]['chunkId'];

            $tableInfo[] = [
                'id' => $tableId,
                'title' => $ctData['title'],
                'type' => $ctData['type'],
                'chunkId' => $chunkId,
            ];
        }
        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        return $this->responseWithJson($response, $tableInfo);
    }


    public function getMultiChunkEditionInfo(Request $request, Response $response) : Response {
        $apiCall = 'getMultiChunkEditionInfo';
        $this->profiler->start();
        $userId =  (int) $request->getAttribute('userId');

        $editionInfo = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionInfoForUserId($userId);

        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        return $this->responseWithJson($response, $editionInfo);
    }
}
