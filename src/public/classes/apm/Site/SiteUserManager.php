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

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

/**
 * Site Controller class
 *
 */
class SiteUserManager extends SiteController
{

    public function userProfilePage(Request $request, Response $response)
    {
        
        $profileUsername = $request->getAttribute('username');
        $this->profiler->start();
        if (!$this->dataManager->userManager->userExistsByUsername($profileUsername)) {
            return $this->view->render($response, 'user.notfound.twig', [
                        'userinfo' => $this->userInfo,
                        'copyright' => $this->getCopyrightNotice(),
                        'baseurl' => $this->getBaseUrl(),
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
        $docIds = $this->dataManager->getDocIdsTranscribedByUser($userId);
        
        $docListHtml = '';
        foreach($docIds as $docId) {
            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
        }
        
        $this->profiler->stop();
        $this->logProfilerData('userProfilePage-' . $profileUsername);
        return $this->view->render($response, 'user.profile.twig', [
                    'userinfo' => $this->userInfo,
                    'copyright' => $this->getCopyrightNotice(),
                    'baseurl' => $this->getBaseUrl(),
                    'theuser' => $userProfileInfo,
                    'canEditProfile' => $canEditProfile,
                    'canMakeRoot' => $canMakeRoot,
                    'doclist' => $docListHtml
        ]);
    }

    public function userManagerPage(Request $request, Response $response)
    {
        $this->profiler->start();
        $um = $this->dataManager->userManager;
        if (!$um->isUserAllowedTo($this->userInfo['id'], 'manageUsers')){
            return $this->view->render(
                    $response, 
                    'error.notallowed.twig', 
                    [
                        'userinfo' => $this->userInfo,
                        'copyright' => $this->getCopyrightNotice(),
                        'baseurl' => $this->getBaseUrl(),
                        'message' => 'You are not authorized to manage users.'
                    ]
                );
        }
        
        $users = $um->getUserInfoForAllUsers();
        
        $this->profiler->stop();
        $this->logProfilerData('userManagerPage');
        return $this->view->render($response, 'user.manager.twig', [
            'userinfo' => $this->userInfo,
            'copyright' => $this->getCopyrightNotice(),
            'baseurl' => $this->getBaseUrl(),
            'users' => $users
        ]);
    }
    
    public function userSettingsPage(Request $request, Response $response)
    {
        $username = $request->getAttribute('username');
        $curUserName = $this->userInfo['username'];
        $userId = $this->userInfo['id'];
        if ($username !== $curUserName && 
                !$this->dataManager->userManager->isUserAllowedTo($userId, 'edit-user-settings')){
            return $this->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->userInfo,
                'copyright' => $this->getCopyrightNotice(),
                'baseurl' => $this->getBaseUrl(),
                'message' => 'You are not authorized to change the settings for user ' . $username
            ]);
        }
        
        if (!$this->dataManager->userManager->userExistsByUsername($username)){
        return $this->view->render($response, 'user.notfound.twig', [
            'userinfo' => $this->userInfo,
            'copyright' => $this->getCopyrightNotice(),
            'baseurl' => $this->getBaseUrl(),
            'theuser' => $username
        ]);
        }
        $userInfo = $this->dataManager->userManager->getUserInfoByUsername($username);
    
        return $this->view->render($response, 'user.settings.twig', [
            'userinfo' => $this->userInfo,
            'copyright' => $this->getCopyrightNotice(),
            'baseurl' => $this->getBaseUrl(),
            'canedit' => true,
            'theuser' => $userInfo
        ]);
    }
    
    
}
