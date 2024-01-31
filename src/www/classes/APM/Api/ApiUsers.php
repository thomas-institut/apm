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
use APM\System\Person\InvalidPersonNameException;
use APM\System\SystemManager;
use APM\System\User\InvalidEmailAddressException;
use APM\System\User\InvalidPasswordException;
use APM\System\User\InvalidUserNameException;
use APM\System\User\UserNameAlreadyInUseException;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use Exception;
use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;

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


    public function getAllUsers(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );

        $um = $this->getDataManager()->userManager;

        $users = $um->getUserInfoForAllUsers();
        $origin = $request->getHeaders()["Origin"];
        // TODO: check origin against list of valid origins
        $response = $response->withHeader("Access-Control-Allow-Origin", $origin)->withHeader("Access-Control-Allow-Credentials", "true");
        return $this->responseWithJson($response, $users);
    }


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
                    [ 'apiUserTid' => $this->apiUserTid,
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
        $name = $postData['name'];
        $email = $postData['email'];
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);

        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info from user ID",
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
       
        if ($name == '') {
            $this->logger->warning("No name given",
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->apiUserTid);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && 
                !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to update "
                    . "$profileUserName's profile but she/he is not allowed", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return  $this->responseWithStatus($response, 403);
        }
        if ($name === $profileUserInfo['name'] &&
                $email === $profileUserInfo['email']) {
            $this->logger->notice("$updater tried to update "
                    . "$profileUserName's profile, but without new information", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return  $this->responseWithStatus($response, 200);
        }
        
        if ($um->updateUserInfo($profileUserId, $name, $email) !== false) {
            
            $this->logger->info("$updater updated $profileUserName's "
                    . "profile with name '$name', email '$email'",
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 200);
        }

        $this->logger->error("Could not update user $profileUserId with "
                . "fullname '$name', email '$email'",
                [ 'apiUserTid' => $this->apiUserTid,
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
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $profileUserName = $profileUserInfo['username'];


        $updaterInfo = $um->getUserInfoByUserId($this->apiUserTid);
        $updater = $updaterInfo['username'];
        if ($updater != $profileUserName && 
                !$um->isUserAllowedTo($updaterInfo['id'], 'manageUsers')) {
            $this->logger->warning("$updater tried to changer "
                    . "$profileUserName's password but she/he is not allowed", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 403);
        }
        if ($password1 == '') {
             $this->logger->warning("Empty password for user "
                     . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user "
                    . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }

        if ($um->storeUserPassword($profileUserName, $password1)) {
            $this->logger->info("$updater changed "
                    . "$profileUserName's password", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 200);
        }

        $this->logger->error("Error storing new password for "
                . "$profileUserName, change attempted by $updater", 
                    [ 'apiUserTid' => $this->apiUserTid,
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
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $um = $this->getDataManager()->userManager;
        
        $profileUserInfo = $um->getUserInfoByUserId($profileUserId);
        if ($profileUserInfo === false ) {
            $this->logger->error("Error getting info for user ID", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 409);
        }
        $profileUserName = $profileUserInfo['username'];
        $updaterInfo = $um->getUserInfoByUserId($this->apiUserTid);
        $updater = $updaterInfo['username'];
        if (!$um->isRoot($updaterInfo['id'])) {
            $this->logger->warning("$updater tried to make $profileUserName "
                    . "root but she/he is not allowed", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 403);
        }
        
       if ($um->makeRoot($profileUserId)) {
            $this->logger->info("$updater gave root status to $profileUserName", 
                    [ 'apiUserTid' => $this->apiUserTid,
                      'userId' => $profileUserId]);
            return $this->responseWithStatus($response, 200);
        }
        
        $this->logger->error("Error making $profileUserName root, change "
                . "attempted by $updater", 
                    [ 'apiUserTid' => $this->apiUserTid,
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
//        $um = $this->getDataManager()->userManager;
        $apmUserManager = $this->systemManager->getUserManager();
        $personManager = $this->systemManager->getPersonManager();
        $postData = $request->getParsedBody();
        $userName = $postData['username'];
        $name = $postData['name'];
        $sortName = $postData['sortName'] ?? $name;
        $email = $postData['email'];
        $password1 = $postData['password1'];
        $password2 = $postData['password2'];


        try {
            $updaterInfo = $apmUserManager->getUserData($this->apiUserTid);
            $updater = $updaterInfo->userName;
            if (!$apmUserManager->isUserAllowedTo($this->apiUserTid, UserTag::MANAGE_USERS)) {
                $this->logger->warning("$updater tried to create a user, "
                    . "but she/he is not allowed",
                    ['apiUserTid' => $this->apiUserTid]);
                return $this->responseWithStatus($response, 401);
            }
        } catch (UserNotFoundException) {
            $this->logger->error("Could not get user data for api User $this->apiUserTid");
            return $this->responseWithStatus($response, 404);
        }

        if ($userName == '') {
            $this->logger->warning("No username given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }
        if ($name == '') {
            $this->logger->warning("No name given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }
        
        if ($password1 == '') {
            $this->logger->warning("No password given for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }
        if ($password1 !== $password2) {
            $this->logger->warning("Passwords do not match for user creation, "
                    . "change attempted by $updater", 
                    ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }
        
        // Create the user
        if ($apmUserManager->getUserTidForUserName($userName) !== -1) {
             $this->logger->error("$userName already exists, "
                     . "creation attempted by $updater", 
                    ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }

        try {
            $newUserTid = $personManager->createPerson($name, $sortName);
        } catch (InvalidPersonNameException) {
            $this->logger->error("The given name for the new user is not valid: '$name'",
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }

        try {
            $apmUserManager->createUser($newUserTid, $userName);
        } catch (InvalidUserNameException) {
            $this->logger->error("The given username for the new user is not valid: '$userName'",
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        } catch (UserNameAlreadyInUseException) {
            $this->logger->error("The given username for the new user is already in use: '$name'",
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }

        try {
            $apmUserManager->changeEmailAddress($newUserTid, $email);
        } catch (InvalidEmailAddressException $e) {
            $this->logger->error("The given email address for the new user is not valid: '$email'",
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        } catch (UserNotFoundException $e) {
            $this->logger->error("Could not update user email address: " .$e->getMessage(),
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }

        try {
            $apmUserManager->changePassword($newUserTid, $password1);
        } catch (InvalidPasswordException $e) {
            $this->logger->error("The password for the new user is not valid",
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        } catch (UserNotFoundException $e) {
            $this->logger->error("Could not update user's password: " .$e->getMessage(),
                ['apiUserTid' => $this->apiUserTid]);
            return $this->responseWithStatus($response, 409);
        }

        $this->logger->info("$userName successfully created by $updater",
                    ['apiUserTid' => $this->apiUserTid ,
                     'userTid' => $newUserTid]);
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
        $userTid =  (int) $request->getAttribute('userId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $userTid);

        $cacheKey = self::CACHE_KEY_PREFIX_TRANSCRIBED_PAGES . $userTid;
        $cacheHit = true;
        $dataCache = $this->systemManager->getSystemDataCache();
        $this->systemManager->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $data = unserialize($dataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $cacheHit = false;
            $data = self::buildTranscribedPagesData($this->systemManager, $userTid);
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

    static public function buildTranscribedPagesData(SystemManager $systemManager, int $userTid) : array {
        $dm = $systemManager->getDataManager();
        $docManager = $systemManager->getTranscriptionManager()->getDocManager();
        $pageManager = $systemManager->getTranscriptionManager()->getPageManager();

        $helper = new DataRetrieveHelper();
        $helper->setLogger($systemManager->getLogger());
        $docIds = $dm->getDocIdsTranscribedByUser($userTid);
        $docInfoArray = $helper->getDocInfoArrayFromList($docIds, $docManager);
        $allPageIds = [];

        foreach($docIds as $docId) {
            $pageIds = $dm->getPageIdsTranscribedByUser($userTid, $docId);
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
        $userTid =  (int) $request->getAttribute('userTid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . Tid::toBase36String($userTid));

        $cacheKey = self::CACHE_KEY_PREFIX_CT_INFO . $userTid;

        $cacheHit = true;
        $dataCache = $this->systemManager->getSystemDataCache();
        $this->systemManager->getSqlQueryCounterTracker()->incrementSelect();
        try {
            $data = unserialize($dataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $cacheHit = false;
            $data = self::buildCollationTableInfoForUser($this->systemManager, $userTid);
            $dataCache->set($cacheKey, serialize($data), self::CACHE_TTL_CT_INFO);
        }

        if ($cacheHit) {
            $this->systemManager->getCacheTracker()->incrementHits();
        } else {
            $this->systemManager->getCacheTracker()->incrementMisses();
        }
        return $this->responseWithJson($response, $data);
    }

    static public function buildCollationTableInfoForUser(SystemManager $systemManager, int $userTid) : array {
        $ctManager = $systemManager->getCollationTableManager();
        $tableIds = $ctManager->getCollationTableVersionManager()->getActiveCollationTableIdsForUser($userTid);
        $logger = $systemManager->getLogger();
        $tableInfo = [];
        $worksCited = [];
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
            $workInfo[$work] = $systemManager->getDataManager()->getWorkInfoByDareId($work);
        }

        return ['tableInfo' => $tableInfo, 'workInfo' => $workInfo];
    }

    static public function updateCtInfoData(SystemManager $systemManager, int $userTid) : bool {
        try {
            $data = self::buildCollationTableInfoForUser($systemManager, $userTid);
        } catch(Exception $e) {
            $systemManager->getLogger()->error("Exception while building CollationTable Data for user $userTid",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        $systemManager->getSystemDataCache()->set(self::CACHE_KEY_PREFIX_CT_INFO . $userTid,
            serialize($data), self::CACHE_TTL_CT_INFO);
        return true;
    }

    public function getMultiChunkEditionsByUser(Request $request, Response $response) : Response {
        $userTid =  (int) $request->getAttribute('userTid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . Tid::toBase36String($userTid));
        $editionInfo = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionsByUser($userTid);
        return $this->responseWithJson($response, $editionInfo);
    }
}
