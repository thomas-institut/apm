<?php

namespace APM\Site;

use APM\System\Person\PersonNotFoundException;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\EntitySystem\Tid;

class SitePeople extends SiteController
{
    const TEMPLATE_PEOPLE = 'people-page.twig';
    const TEMPLATE_PERSON = 'person-page.twig';

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */

    public function peoplePage(Request $request, Response $response): Response
    {
        return $this->renderPage($response, self::TEMPLATE_PEOPLE,[]);
    }

    public function personPage(Request $request, Response $response): Response
    {
        $tid = $request->getAttribute('tid');

        $pm = $this->systemManager->getPersonManager();

        $tidFromSlug = $pm->getPersonTidFromSlug($tid);
        if ($tidFromSlug !== -1) {
            $tid = $tidFromSlug;
        } else {
            $tid = Tid::fromString($tid);
            if ($tid === -1) {
                return $this->getBasicErrorPage($response, 'Error', "Invalid entity id", HttpStatus::BAD_REQUEST);
            }
        }
        $um = $this->systemManager->getUserManager();
        $canManageUsers = false;
        try {
            $canManageUsers = $um->isUserAllowedTo($this->userTid, UserTag::MANAGE_USERS);
        } catch (UserNotFoundException) {
            // should never happen
            $this->getSystemErrorPage($response, "User not found", [ 'tid' => $this->userTid]);
        }
        try {
            $data = $pm->getPersonEssentialData($tid);
            $userData = [];
            if ($um->isUser($tid)) {
                if ($canManageUsers || $this->userTid === $tid) {
                    $userData = $um->getUserData($tid)->getExportObject();
                    unset($userData['passwordHash']);
                }
            }
            return $this->renderPage($response,
                self::TEMPLATE_PERSON,
                [   'tid' => $tid,
                    'data' => $data->getExportObject(),
                    'canManageUsers' => $canManageUsers,
                    'userData' => $userData
                ],
                true,
                false);
        } catch (PersonNotFoundException) {
            // should never happen
            return $this->getSystemErrorPage($response, 'Could not get Person essential data', [
                'tid' => $tid, 'function' => __FUNCTION__]);
        } catch (UserNotFoundException) {
            // should never happen
            return $this->getSystemErrorPage($response, 'Could not get User  data', [
                'tid' => $tid, 'function' => __FUNCTION__]);
        }
    }

}