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


namespace AverroesProject\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

/**
 * Site Controller class
 *
 */
class SiteUserManager extends SiteController
{

    public function userProfilePage(Request $request, Response $response, $next)
    {
        
        $profileUsername = $request->getAttribute('username');
        $profiler = new ApmProfiler('userProfilePage-' . $profileUsername, $this->db);
        if (!$this->db->um->userExistsByUsername($profileUsername)) {
            return $this->ci->view->render($response, 'user.notfound.twig', [
                        'userinfo' => $this->ci->userInfo,
                        'copyright' => $this->ci->copyrightNotice,
                        'baseurl' => $this->ci->settings['baseurl'],
                        'theuser' => $profileUsername
            ]);
        }

        $userProfileInfo = 
                $this->db->um->getUserInfoByUsername($profileUsername);
        $currentUserId = $this->ci->userInfo['id'];

        $canEditProfile = $userProfileInfo['id'] === $currentUserId ||
                $this->db->um->isUserAllowedTo($currentUserId, 'manageUsers');
        $canMakeRoot = 
                $this->db->um->isUserAllowedTo($currentUserId, 'makeRoot');
        $userProfileInfo['isroot'] = 
                $this->db->um->isRoot($userProfileInfo['id']);
        $userProfileInfo['isreadonly'] = 
                $this->db->um->userHasRole($userProfileInfo['id'], 'readOnly');
        

        $profiler->lap("Basic Info");
        $userId = $userProfileInfo['id'];
        $docIds = $this->db->getDocIdsTranscribedByUser($userId);
        
        $docListHtml = '';
        foreach($docIds as $docId) {
            $docListHtml .= $this->genDocPagesListForUser($userId, $docId);
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'user.profile.twig', [
                    'userinfo' => $this->ci->userInfo,
                    'copyright' => $this->ci->copyrightNotice,
                    'baseurl' => $this->ci->settings['baseurl'],
                    'theuser' => $userProfileInfo,
                    'canEditProfile' => $canEditProfile,
                    'canMakeRoot' => $canMakeRoot,
                    'doclist' => $docListHtml
        ]);
    }

    public function userManagerPage(Request $request, Response $response, 
            $next)
    {
        $profiler = new ApmProfiler('userManagerPage', $this->db);
        $um = $this->db->userManager;
        if (!$um->isUserAllowedTo($this->ci->userInfo['id'], 'manageUsers')){
            return $this->ci->view->render(
                    $response, 
                    'error.notallowed.twig', 
                    [
                        'userinfo' => $this->ci->userInfo, 
                        'copyright' => $this->ci->copyrightNotice,
                        'baseurl' => $this->ci->settings['baseurl'],
                        'message' => 'You are not authorized to manage users.'
                    ]
                );
        }
        
        $db = $this->db;
        $docIds = $db->getDocIdList('title');
        $users = $um->getUserInfoForAllUsers();
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'user.manager.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'users' => $users
        ]);
    }
    
    public function userSettingsPage(Request $request, Response $response, 
            $next)
    {
        $username = $request->getAttribute('username');
        $curUserName = $this->ci->userInfo['username'];
        $userId = $this->ci->userInfo['id'];
        if ($username !== $curUserName && 
                !$this->db->um->isUserAllowedTo($userId, 'edit-user-settings')){
            return $this->ci->view->render($response, 'error.notallowed.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'message' => 'You are not authorized to change the settings for user ' . $username
            ]);
        }
        
        if (!$this->db->um->userExistsByUsername($username)){
        return $this->ci->view->render($response, 'user.notfound.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'theuser' => $username
        ]);
        }
        $userInfo = $this->db->um->getUserInfoByUsername($username);
    
        return $this->ci->view->render($response, 'user.settings.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'canedit' => true,
            'theuser' => $userInfo
        ]);
    }
    
    
}
