<?php

namespace APM\Site;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\Profiler\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\EntitySystem\Tid;

class SitePeople extends SiteController
{

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function personPage(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        SystemProfiler::setName("Site:" . __FUNCTION__ . ":" . $id);

        $id = Tid::fromString($id);
        if ($id === -1) {
            return $this->getBasicErrorPage($response, 'Error', "Invalid entity id", HttpStatus::BAD_REQUEST);
        }

        /** @var ApmEntitySystemInterface $apmEntitySystem */
        $apmEntitySystem = $this->container->get(ApmEntitySystemInterface::class);
        try {
            $rawEntityData = $apmEntitySystem->getEntityData($id);
        } catch (EntityDoesNotExistException) {
            return $this->getBasicErrorPage($response, 'Error', "Person $id does not exist", HttpStatus::NOT_FOUND);
        }

        if ($rawEntityData->type !== Entity::tPerson) {
            return $this->getBasicErrorPage($response, 'Error', "Person $id does not exist", HttpStatus::NOT_FOUND);
        }

        /** @var UserManagerInterface $um */
        $um = $this->container->get(UserManagerInterface::class);
        $canManageUsers = false;
        try {
            $canManageUsers = $um->isUserAllowedTo($this->userId, UserTag::MANAGE_USERS);
        } catch (UserNotFoundException) {
            // should never happen
            $this->getSystemErrorPage($response, "User not found", [ 'id' => $this->userId]);
        }

        $data = [];
        $data['id'] = $id;
        $data['name'] = $rawEntityData->name;
        $data['userData'] = null;
        $data['isUser'] = false;
        $userData = [];
        if ($um->isUser($id)) {
            $data['isUser'] = true;
            if ($canManageUsers || $this->userId === $id) {
                try {
                    $userData = $um->getUserData($id)->getExportObject();
                } catch (UserNotFoundException) {
                    // should never happen
                    $this->getSystemErrorPage($response, "User not found", [ 'id' => $this->userId]);
                }
                unset($userData['passwordHash']);
                $data['userData'] = $userData;
            }
        }

        return $this->renderStandardPage(
            $response,
            '',
            'Person',
            'PersonPage',
            'js/pages/PersonPage.ts',
            [
                'personData' => $data,
                'canManageUsers' => $canManageUsers
            ],
            [],
            [ 'person_page.css']
        );
    }

}