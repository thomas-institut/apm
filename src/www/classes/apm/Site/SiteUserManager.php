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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use InvalidArgumentException;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;


/**
 * Site Controller class
 *
 */
class SiteUserManager extends SiteController
{

    const TEMPLATE_USER_MANAGER = 'user-manager.twig';
    const TEMPLATE_USER_PROFILE = 'user-profile.twig';
    const TEMPLATE_USER_SETTINGS = 'user-settings.twig';
    const TEMPLATE_USER_NOT_FOUND = 'user-error-not-found.twig';


    /**
     * @param Request $request
     * @param Response $response
     * @return Response

     */
    public function userProfilePage(Request $request, Response $response): Response
    {
        
        $profileUsername = $request->getAttribute('username');
        $this->profiler->start();
        if (!$this->dataManager->userManager->userExistsByUsername($profileUsername)) {
            return $this->renderPage($response, self::TEMPLATE_USER_NOT_FOUND, [
                        'theuser' => $profileUsername
            ]);
        }

        $userProfileInfo = 
                $this->dataManager->userManager->getUserInfoByUsername($profileUsername);
        $currentUserId = $this->userInfo['id'];

        $canEditProfile = $userProfileInfo['id'] === $currentUserId ||
                $this->dataManager->userManager->isUserAllowedTo($currentUserId, 'manageUsers');
        $canMakeRoot = 
                $this->dataManager->userManager->isUserAllowedTo($currentUserId, 'makeRoot');
        $userProfileInfo['isroot'] = 
                $this->dataManager->userManager->isRoot($userProfileInfo['id']);
        $userProfileInfo['isreadonly'] = 
                $this->dataManager->userManager->userHasRole($userProfileInfo['id'], 'readOnly');
        

        $this->profiler->lap("Basic Info");
        $userId = $userProfileInfo['id'];
//        $docIds = $this->dataManager->getDocIdsTranscribedByUser($userId);
//
//        $docListHtml = '';
//        foreach($docIds as $docId) {
//            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
//        }

//        $ctManager = $this->systemManager->getCollationTableManager();
//        $tableIds = $ctManager->getCollationTableVersionManager()->getActiveCollationTableIdsForUserId($userId);
//        $tableInfo = [];
//        foreach($tableIds as $tableId) {
//            try {
//                $ctData = $ctManager->getCollationTableById($tableId, TimeString::now());
//            } catch(InvalidArgumentException $e) {
//                $this->logger->error("Table $tableId reported as being active does not exist. Is version table consistent?");
//                continue;
//            }
//            $chunkId = $ctData['chunkId'] ?? $ctData['witnesses'][0]['chunkId'];
//
//            $tableInfo[] = [
//                'id' => $tableId,
//                'title' => $ctData['title'],
//                'type' => $ctData['type'],
//                'chunkId' => $chunkId,
//            ];
//        }

        $this->profiler->stop();
        $this->logProfilerData('userProfilePage-' . $profileUsername);
        return $this->renderPage($response, self::TEMPLATE_USER_PROFILE, [
                    'theuser' => $userProfileInfo,
                    'canEditProfile' => $canEditProfile,
                    'canMakeRoot' => $canMakeRoot,
//                    'doclist' => $docListHtml,
//                    'tableInfo' => $tableInfo
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function userManagerPage(Request $request, Response $response): Response
    {
        $this->profiler->start();
        $um = $this->dataManager->userManager;
        if (!$um->isUserAllowedTo($this->userInfo['id'], 'manageUsers')){
            return $this->renderPage(
                    $response, 
                    self::TEMPLATE_ERROR_NOT_ALLOWED,
                    [
                        'message' => 'You are not authorized to manage users.'
                    ]
                );
        }
        
        $users = $um->getUserInfoForAllUsers();
        
        $this->profiler->stop();
        $this->logProfilerData('userManagerPage');
        return $this->renderPage($response, self::TEMPLATE_USER_MANAGER, [
            'users' => $users
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function userSettingsPage(Request $request, Response $response): Response
    {
        $username = $request->getAttribute('username');
        $curUserName = $this->userInfo['username'];
        $userId = $this->userInfo['id'];
        if ($username !== $curUserName && 
                !$this->dataManager->userManager->isUserAllowedTo($userId, 'edit-user-settings')){
            return $this->renderPage($response, self::TEMPLATE_ERROR_NOT_ALLOWED, [
                'message' => 'You are not authorized to change the settings for user ' . $username
            ]);
        }
        
        if (!$this->dataManager->userManager->userExistsByUsername($username)){
        return $this->renderPage($response, self::TEMPLATE_USER_NOT_FOUND, [
            'theuser' => $username
        ]);
        }
        $userInfo = $this->dataManager->userManager->getUserInfoByUsername($username);
    
        return $this->renderPage($response, self::TEMPLATE_USER_SETTINGS, [
            'canedit' => true,
            'theuser' => $userInfo
        ]);
    }
    
    
}
