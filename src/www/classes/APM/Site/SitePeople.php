<?php

namespace APM\Site;

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\Session\Exception\SessionNotFoundException;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\SystemProfiler;
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
     * @throws SessionNotFoundException
     */

    public function peoplePage(Request $request, Response $response): Response
    {
        SystemProfiler::setName("Site:" . __FUNCTION__);
        return $this->renderPage($response, self::TEMPLATE_PEOPLE,[]);
    }

    /**
     * @throws SessionNotFoundException
     */
    public function personPage(Request $request, Response $response): Response
    {
        $tid = $request->getAttribute('tid');
        SystemProfiler::setName("Site:" . __FUNCTION__ . ":" . $tid);

        $tid = Tid::fromString($tid);
        if ($tid === -1) {
            return $this->getBasicErrorPage($response, 'Error', "Invalid entity id", HttpStatus::BAD_REQUEST);
        }
        try {
            $rawEntityData = $this->systemManager->getEntitySystem()->getEntityData($tid);
        } catch (EntityDoesNotExistException) {
            return $this->getBasicErrorPage($response, 'Error', "Person $tid does not exist", HttpStatus::NOT_FOUND);
        }

        if ($rawEntityData->type !== Entity::tPerson) {
            return $this->getBasicErrorPage($response, 'Error', "Person $tid does not exist", HttpStatus::NOT_FOUND);
        }

        $um = $this->systemManager->getUserManager();
        $canManageUsers = false;
        try {
            $canManageUsers = $um->isUserAllowedTo($this->userTid, UserTag::MANAGE_USERS);
        } catch (UserNotFoundException) {
            // should never happen
            $this->getSystemErrorPage($response, "User not found", [ 'tid' => $this->userTid]);
        }

        $data = [];
        $data['tid'] = $tid;
        $data['name'] = $rawEntityData->name;

        $data['userData'] = null;
        $data['isUser'] = false;
        $userData = [];
        if ($um->isUser($tid)) {
            $data['isUser'] = true;
            if ($canManageUsers || $this->userTid === $tid) {
                try {
                    $userData = $um->getUserData($tid)->getExportObject();
                } catch (UserNotFoundException) {
                    // should never happen
                    $this->getSystemErrorPage($response, "User not found", [ 'tid' => $this->userTid]);
                }
                unset($userData['passwordHash']);
                $data['userData'] = $userData;
            }
        }

        $data['sortName'] = $rawEntityData->getObjectForPredicate(Entity::pSortName);
        $data['description'] = $rawEntityData->getObjectForPredicate(Entity::pEntityDescription) ?? '';
        $data['dateOfBirth'] = $rawEntityData->getObjectForPredicate(Entity::pDateOfBirth);
        $data['dateOfDeath'] = $rawEntityData->getObjectForPredicate(Entity::pDateOfDeath);
        $data['viafId'] = $rawEntityData->getObjectForPredicate(Entity::pViafId);
        $data['wikiDataId'] = $rawEntityData->getObjectForPredicate(Entity::pWikiDataId);
        $data['orcidId'] = $rawEntityData->getObjectForPredicate(Entity::pOrcid);
        $data['locId'] = $rawEntityData->getObjectForPredicate(Entity::pLocId);
        $data['gndId'] =  $rawEntityData->getObjectForPredicate(Entity::pGNDId);
        $data['urls']  = [];

        $urlObjectArray = $rawEntityData->getAllObjectsForPredicateByQualificationPredicate(Entity::pUrl, Entity::pObjectUrlType, 0);

        foreach($urlObjectArray as $key => $value) {
            if ($key === 0) {
                $name = "Other";
            } else {
                try {
                    $name = $this->systemManager->getEntitySystem()->getEntityData($key)->name;
                } catch (EntityDoesNotExistException) {
                    $this->logger->error("Found undefined url type $key in data");
                    $name = "Other";
                }
            }
            $data['urls'][] = [ 'name' => $name, 'url' => $value];
        }


        return $this->renderPage($response,
            self::TEMPLATE_PERSON,
            [   'tid' => $tid,
                'data' => $data,
                'canManageUsers' => $canManageUsers
            ]);
    }

}