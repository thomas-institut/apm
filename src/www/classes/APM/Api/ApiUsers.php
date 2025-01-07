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

use APM\System\Cache\CacheKey;
use APM\System\DataRetrieveHelper;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\InvalidEmailAddressException;
use APM\System\User\InvalidPasswordException;
use APM\System\User\InvalidUserNameException;
use APM\System\User\UserNameAlreadyInUseException;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\System\Work\WorkNotFoundException;
use APM\ToolBox\HttpStatus;
use Exception;
use InvalidArgumentException;
use OpenSearch\Common\Exceptions\Missing404Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use RuntimeException;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;

/**
 * API Controller class
 *
 */
class ApiUsers extends ApiController
{

    const CLASS_NAME = 'Users';
    const CACHE_TTL_TRANSCRIBED_PAGES = 7 * 24 * 3600;  // 7 days
    const CACHE_TTL_CT_INFO = 7 * 24 * 3600;  // 7 days
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function updateUserProfile(Request $request, Response $response): Response
    {
        $profileUserTid =  (int) $request->getAttribute('userTid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $profileUserTid);

        $newUserManager = $this->systemManager->getUserManager();

        if ($profileUserTid === $this->apiUserId) {
            $this->logger->info("User $profileUserTid is changing their own user profile");
        } else {
            if (!$newUserManager->isUserAllowedTo($this->apiUserId, UserTag::MANAGE_USERS)) {
                $this->logger->error("Api user $this->apiUserId not allowed to update user profile $profileUserTid");
                return $this->responseWithStatus($response, HttpStatus::UNAUTHORIZED);
            }
            $this->logger->info("User $this->apiUserId is changing user profile $profileUserTid");
        }

        $postData = $request->getParsedBody();
        $email = trim($postData['email']) ?? '';
        $password1 = trim($postData['password1']) ?? '';
        $password2 = trim($postData['password2']) ?? '';

        try {
            $userData = $newUserManager->getUserData($profileUserTid);
        } catch (UserNotFoundException) {
            $this->logger->error("User $profileUserTid not found");
            return $this->responseWithJson($response, [ 'errorMsg' => 'User not found' ], HttpStatus::NOT_FOUND);
        }

        $changesMade = false;

        // update email address, if it's different from current one
        if ($email !== '' && $email !== $userData->emailAddress) {
            try {
                $newUserManager->changeEmailAddress($profileUserTid, $email);
                $changesMade = true;
            } catch (InvalidEmailAddressException) {
                $this->logger->error("Invalid email address '$email' updating user profile $profileUserTid");
                return $this->responseWithJson($response, [ 'errorMsg' => 'Invalid email address' ], HttpStatus::BAD_REQUEST);
            } catch (Exception $e) {
                $this->logException($e, "SystemError");
                return $this->responseWithJson($response, [ 'errorMsg' => 'System Error' ], HttpStatus::INTERNAL_SERVER_ERROR);
            }
        }

        if ($password1 !== '' && $password2 !== $password1) {
            $this->logger->error("Passwords do not match in request to update user profile $profileUserTid");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Passwords do not match' ], HttpStatus::BAD_REQUEST);
        }

        if ($password1 !== '') {
            try {
                $newUserManager->changePassword($profileUserTid, $password1);
                $changesMade = true;
            } catch (InvalidPasswordException) {
                $this->logger->error("Invalid password updating user profile $profileUserTid");
                return $this->responseWithJson($response, [ 'errorMsg' => 'Invalid password' ], HttpStatus::BAD_REQUEST);
            } catch (Exception $e) {
                $this->logException($e, "SystemError");
                return $this->responseWithJson($response, [ 'errorMsg' => 'System Error' ], HttpStatus::INTERNAL_SERVER_ERROR);
            }
        }
        if (!$changesMade) {
            $this->logger->info("No changes to profile $profileUserTid in a valid API call");
        }

        return $this->responseWithStatus($response, HttpStatus::SUCCESS);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws UserNotFoundException
     */
    public function createNewUser(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $apmUserManager = $this->systemManager->getUserManager();
        $personManager = $this->systemManager->getPersonManager();

        $personTid = intval($request->getAttribute('personTid'));
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $personTid);

        if (!$apmUserManager->isUserAllowedTo($this->apiUserId, UserTag::MANAGE_USERS)) {
            $this->logger->error("Api user $this->apiUserId not allowed to create users");
            return $this->responseWithStatus($response, HttpStatus::UNAUTHORIZED);
        }
        $this->logger->info("User $this->apiUserId is making user $personTid");

        try {
            $personData = $personManager->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException) {
            $this->logger->error("Person $personTid not found");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Person not found' ], HttpStatus::NOT_FOUND);
        }

        if ($personData->isUser) {
            $this->logger->info("Person $personTid is already a user");
            return $this->responseWithJson($response, [ 'info' => 'Person already a user' ], HttpStatus::SUCCESS);
        }

        $postData = $request->getParsedBody();

        $userName = trim($postData['username']) ?? '';
        $requiredData = [
            'username' => $userName,
        ];

        foreach($requiredData as $key => $value) {
            if ($value === '') {
                $this->logger->error("No $key given for user creation");
                return $this->responseWithJson($response, [ 'errorMsg' => "$key not given"], HttpStatus::BAD_REQUEST);
            }
        }

        // attempt to create the user
        try {
            $apmUserManager->createUser($personTid, $userName);
        } catch (InvalidUserNameException) {
            $this->logger->error("Invalid username creating user $personTid");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Invalid username' ], HttpStatus::BAD_REQUEST);
        } catch (UserNameAlreadyInUseException) {
            $this->logger->error("Username already exists creating user $personTid");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Username already in use' ], HttpStatus::CONFLICT);
        }
        // the user has been created
        return $this->responseWithStatus($response, HttpStatus::SUCCESS);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getTranscribedPages(Request $request, Response $response) : Response
    {
        $this->profiler->start();
        $userTid =  (int) $request->getAttribute('userTid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $userTid);

        $cacheKey = CacheKey::ApiUsersTranscribedPages . $userTid;
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
        $systemManager->getSystemDataCache()->set(CacheKey::ApiUsersTranscribedPages. $userId,
            serialize($data), self::CACHE_TTL_TRANSCRIBED_PAGES);
        return true;
    }


    static public function buildTranscribedPagesData(SystemManager $systemManager, int $userId) : array {
        $docManager = $systemManager->getDocumentManager();
        $txManager = $systemManager->getTranscriptionManager();

        $helper = new DataRetrieveHelper();
        $helper->setLogger($systemManager->getLogger());
        $docIds = $txManager->getDocIdsTranscribedByUser($userId);
        try {
            $docInfoArray = $helper->getDocInfoArrayFromList($docIds, $docManager);
        } catch (DocumentNotFoundException) {
            // should never happen
            throw new RuntimeException("Document not found while getting docInfo array");
        }
        $allPageIds = [];

        foreach($docIds as $docId) {
            $pageIds = $txManager->getPageIdsTranscribedByUser($userId, $docId);
            $docInfoArray[$docId]->pageIds = $pageIds;
            foreach($pageIds as $pageId) {
                $allPageIds[] = $pageId;
            }
        }

        try {
            $pageInfoArray = $helper->getPageInfoArrayFromList($allPageIds, $docManager);
        } catch (PageNotFoundException) {
            // should never happen
            throw new RuntimeException("Document not found while getting pageInfo array");
        }
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

        $cacheKey = CacheKey::ApiUsersCollationTableInfoData . $userTid;

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
            try {
                $workData= get_object_vars($systemManager->getWorkManager()->getWorkDataByDareId($work));
                $authorId = $workData['authorId'];
                $authorName = $systemManager->getPersonManager()->getPersonEssentialData($authorId)->name;
                $workData['author_name'] =$authorName;
                $workInfo[$work] = $workData;

            } catch (WorkNotFoundException) {
                // should never happen!
                throw new RuntimeException("Work $work not found");
            } catch (PersonNotFoundException $e) {
            }
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
        $systemManager->getSystemDataCache()->set(CacheKey::ApiUsersCollationTableInfoData . $userTid,
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
