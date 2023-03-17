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
use APM\System\SystemManager;
use Exception;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;

/**
 * API Controller class
 *
 */
class ApiUsers extends ApiController
{

    const CLASS_NAME = 'Users';
    const CACHE_KEY_PREFIX_TRANSCRIBED_PAGES = 'ApiUsers-TranscribedPagesData-';

    const CACHE_TTL_TRANSCRIBED_PAGES = 7 * 24 * 3600;  // 7 days

    const CACHE_KEY_PREFIX_CT_INFO = 'ApiUsers-CollationTableInfoData-';

    const CACHE_TTL_CT_INFO = 7 * 24 * 3600;  // 7 days

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getUserProfileInfo(Request $request, Response $response): Response
    {
        $this->profiler->start();
        $profileUserId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $profileUserId);

        $um = $this->getDataManager()->userManager;
        $userProfileInfo = $um->getUserInfoByUserId($profileUserId);
        if ($userProfileInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $userProfileInfo['isroot'] = $um->isRoot($profileUserId);
        return $this->responseWithJson($response,$userProfileInfo);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function updateUserProfile(Request $request, Response $response): Response
    {
        $profileUserId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $profileUserId);

        $um = $this->getDataManager()->userManager;
        $postData = $request->getParsedBody();
        $fullname = $postData['fullname'];
        $email = $postData['email'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);

        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
       
        if ($fullname == '') {
            $this->logger->warning("No fullname given", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
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
            return  $this->responseWithStatus($response, 403);
        }
        if ($fullname === $profileUserInfo['fullname'] && 
                $email === $profileUserInfo['email']) {
            $this->logger->notice("$updater tried to update "
                    . "$profileUserName's profile, but without new information", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return  $this->responseWithStatus($response, 200);
        }
        
        if ($um->updateUserInfo($profileUserId, $fullname, $email) !== false) {
            
            $this->logger->info("$updater updated $profileUserName's "
                    . "profile with fullname '$fullname', email '$email'", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 200);
        }

        $this->logger->error("Could not update user $profileUserId with "
                . "fullname '$fullname', email '$email'", 
                [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
        return $this->responseWithStatus($response, 409);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function changeUserPassword(Request $request, Response $response): Response
    {
        $this->profiler->start();
        $profileUserId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $profileUserId);

        $um = $this->getDataManager()->userManager;
        $postData = $request->getParsedBody();
        $password1 = $postData['password1'];
        $password2 = $postData['password2'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
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
            return $this->responseWithStatus($response, 403);
        }
        if ($password1 == '') {
             $this->logger->warning("Empty password for user "
                     . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user "
                    . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }

        if ($um->storeUserPassword($profileUserName, $password1)) {
            $this->logger->info("$updater changed "
                    . "$profileUserName's password", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 200);
        }

        $this->logger->error("Error storing new password for "
                . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
        return $this->responseWithStatus($response, 409);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function makeUserRoot(Request $request, Response $response): Response
    {
        $profileUserId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $profileUserId);

        $postData = $request->getParsedBody();
        $confirmroot = $postData['confirmroot'];
        if ($confirmroot !== 'on') {
            $this->logger->warning("No confirmation in make root request", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $um = $this->getDataManager()->userManager;
        
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->apiUserId);
        $updater = $updaterInfo['username'];
        if (!$um->isRoot($updaterInfo['id'])) {
            $this->logger->warning("$updater tried to make $profileUserName "
                    . "root but she/he is not allowed", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 403);
        }
        
       if ($um->makeRoot($profileUserId)) {
            $this->logger->info("$updater gave root status to $profileUserName", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 200);
        }
        
        $this->logger->error("Error making $profileUserName root, change "
                . "attempted by $updater", 
                    [ 'apiUserId' => $this->apiUserId,
                      'userId' => $profileUserId]);
        return $this->responseWithStatus($response, 409);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function createNewUser(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
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
            return $this->responseWithStatus($response, 404);
        }
        $updater = $updaterInfo['username'];
        
        if (!$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to create a user, "
                    . "but she/he is not allowed", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 401);
        }
        
        if ($username == '') {
            $this->logger->warning("No username given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 409);
        }
        if ($fullname == '') {
            $this->logger->warning("No fullname given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 409);
        }
        
        if ($password1 == '') {
            $this->logger->warning("No password given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 409);
        }
        
        // Create the user
        if ($um->userExistsByUserName($username)) {
             $this->logger->error("$username already exists, "
                     . "creation attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $newUserId = $um->createUserByUserName($username);
        if ($newUserId === false) {
            $this->logger->error("Can't create user $username, "
                    . "creation attempted by $updater", 
                    ['apiUserId' => $this->apiUserId]);
            return $this->responseWithStatus($response, 409);
        }
        
        // Try to update info, will not return an error to the user, but 
        // will log if there's any problem
        
        // Update the profile info
        if ($um->updateUserInfo($newUserId, $fullname, $email) === false) {
            $this->logger->error("Can't update info for user $username, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId ,
                     'userId' => $newUserId]);
            return $this->responseWithStatus($response, 200);
        }
        
        // Update password
        if (!$um->storeUserPassword($username, $password1)) {
            $this->logger->error("Can't change password for user $username, "
                    . "change attempted by $updater", 
                    ['apiUserId' => $this->apiUserId ,
                     'userId' => $newUserId]);
            return $this->responseWithStatus($response, 200);
        }
        
        $this->logger->info("$username successfully created by $updater", 
                    ['apiUserId' => $this->apiUserId ,
                     'userId' => $newUserId]);
        return $this->responseWithStatus($response, 200);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getTranscribedPages(Request $request, Response $response) : Response
    {
        $this->profiler->start();
        $userId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $userId);

        $cacheKey = self::CACHE_KEY_PREFIX_TRANSCRIBED_PAGES . $userId;
        $cacheHit = true;
        $dataCache = $this->systemManager->getSystemDataCache();
        $this->systemManager->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $data = unserialize($dataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $cacheHit = false;
            $data = self::buildTranscribedPagesData($this->systemManager, $userId);
            $dataCache->set($cacheKey, serialize($data), self::CACHE_TTL_TRANSCRIBED_PAGES);
        }

        if ($cacheHit) {
            $this->systemManager->getCacheTracker()->incrementHits();
        } else {
            $this->systemManager->getCacheTracker()->incrementMisses();
        }

        return $this->responseWithJson($response, $data);
    }

    static public function updateTranscribedPagesData(SystemManager $systemManager, int $userId): bool {
        try {
            $data = self::buildTranscribedPagesData($systemManager, $userId);
        } catch(Exception $e) {
            $systemManager->getLogger()->error("Exception while building TranscribedPages Data for user $userId",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        $systemManager->getSystemDataCache()->set(self::CACHE_KEY_PREFIX_TRANSCRIBED_PAGES . $userId,
            serialize($data), self::CACHE_TTL_TRANSCRIBED_PAGES);
        return true;
    }

    static public function buildTranscribedPagesData(SystemManager $systemManager, int $userId) : array {
        $dm = $systemManager->getDataManager();
        $docManager = $systemManager->getTranscriptionManager()->getDocManager();
        $pageManager = $systemManager->getTranscriptionManager()->getPageManager();

        $helper = new DataRetrieveHelper();
        $helper->setLogger($systemManager->getLogger());
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
        return [
            'docIds' => $docIds,
            'docInfoArray' => $docInfoArray,
            'pageInfoArray' => $pageInfoArray
        ];
    }


    public function getCollationTableInfo(Request $request, Response $response) : Response
    {
        $this->profiler->start();
        $userId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $userId);

        $cacheKey = self::CACHE_KEY_PREFIX_CT_INFO . $userId;

        $cacheHit = true;
        $dataCache = $this->systemManager->getSystemDataCache();
        $this->systemManager->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $data = unserialize($dataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $cacheHit = false;
            $data = self::buildCollationTableInfoForUser($this->systemManager, $userId);
            $dataCache->set($cacheKey, serialize($data), self::CACHE_TTL_CT_INFO);
        }

        if ($cacheHit) {
            $this->systemManager->getCacheTracker()->incrementHits();
        } else {
            $this->systemManager->getCacheTracker()->incrementMisses();
        }
        return $this->responseWithJson($response, $data);
    }

    static public function buildCollationTableInfoForUser(SystemManager $systemManager, int $userId) : array {
        $ctManager = $systemManager->getCollationTableManager();
        $tableIds = $ctManager->getCollationTableVersionManager()->getActiveCollationTableIdsForUserId($userId);
        $logger = $systemManager->getLogger();
        $tableInfo = [];
        $worksCited = [];
        //$this->debug("Getting collation table info for user $userId", [ 'tableIds' => $tableIds]);
        foreach($tableIds as $tableId) {
            try {
                $ctData = $ctManager->getCollationTableById($tableId);
            } catch(InvalidArgumentException) {
                $logger->error("Table $tableId reported as being active does not exist. Is version table consistent?");
                continue;
            }
            if ($ctData['archived']) {
                continue;
            }
            //$this->debug("Processing table id $tableId", ['ctData' => $ctData]);
            $chunkId = $ctData['chunkId'] ?? $ctData['witnesses'][0]['chunkId'];
            [ $work, $chunk] = explode('-', $chunkId);
            $worksCited[$work] = true;

            $tableInfo[] = [
                'id' => $tableId,
                'title' => $ctData['title'],
                'type' => $ctData['type'],
                'chunkId' => $chunkId,
                'work' => $work,
                'chunk' => $chunk
            ];
        }
        $workInfo = [];
        foreach (array_keys($worksCited) as $work) {
            $workInfo[$work] = $systemManager->getDataManager()->getWorkInfo($work);
        }

        return ['tableInfo' => $tableInfo, 'workInfo' => $workInfo];
    }

    static public function updateCtInfoData(SystemManager $systemManager, int $userId) : bool {
        try {
            $data = self::buildCollationTableInfoForUser($systemManager, $userId);
        } catch(Exception $e) {
            $systemManager->getLogger()->error("Exception while building CollationTable Data for user $userId",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        $systemManager->getSystemDataCache()->set(self::CACHE_KEY_PREFIX_CT_INFO . $userId,
            serialize($data), self::CACHE_TTL_CT_INFO);
        return true;
    }

    public function getMultiChunkEditionInfo(Request $request, Response $response) : Response {
        $userId =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $userId);
        $editionInfo = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionInfoForUserId($userId);
        return $this->responseWithJson($response, $editionInfo);
    }
}
