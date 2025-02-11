<?php

namespace APM\Site;

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
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
        SystemProfiler::setName("Site:" . __FUNCTION__);
        return $this->renderPage($response, self::TEMPLATE_PEOPLE,[]);
    }

    /**
     */
    public function personPage(Request $request, Response $response): Response
    {
        $id = $request->getAttribute('id');
        SystemProfiler::setName("Site:" . __FUNCTION__ . ":" . $id);

        $id = Tid::fromString($id);
        if ($id === -1) {
            return $this->getBasicErrorPage($response, 'Error', "Invalid entity id", HttpStatus::BAD_REQUEST);
        }
        try {
            $rawEntityData = $this->systemManager->getEntitySystem()->getEntityData($id);
        } catch (EntityDoesNotExistException) {
            return $this->getBasicErrorPage($response, 'Error', "Person $id does not exist", HttpStatus::NOT_FOUND);
        }

        if ($rawEntityData->type !== Entity::tPerson) {
            return $this->getBasicErrorPage($response, 'Error', "Person $id does not exist", HttpStatus::NOT_FOUND);
        }

        $um = $this->systemManager->getUserManager();
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

//        $data['sortName'] = $rawEntityData->getObjectForPredicate(Entity::pSortName);
//        $data['description'] = $rawEntityData->getObjectForPredicate(Entity::pEntityDescription) ?? '';
//        $data['dateOfBirth'] = $rawEntityData->getObjectForPredicate(Entity::pDateOfBirth);
//        $data['dateOfDeath'] = $rawEntityData->getObjectForPredicate(Entity::pDateOfDeath);
//        $data['viafId'] = $rawEntityData->getObjectForPredicate(Entity::pViafId);
//        $data['wikiDataId'] = $rawEntityData->getObjectForPredicate(Entity::pWikiDataId);
//        $data['orcidId'] = $rawEntityData->getObjectForPredicate(Entity::pOrcid);
//        $data['locId'] = $rawEntityData->getObjectForPredicate(Entity::pLocId);
//        $data['gndId'] =  $rawEntityData->getObjectForPredicate(Entity::pGNDId);
//        $data['urls']  = [];

//        $urlObjectArray = $rawEntityData->getAllObjectsForPredicateByQualificationPredicate(Entity::pUrl, Entity::pObjectUrlType, 0);

//        foreach($urlObjectArray as $key => $value) {
//            if ($key === 0) {
//                $name = "Other";
//            } else {
//                try {
//                    $name = $this->systemManager->getEntitySystem()->getEntityData($key)->name;
//                } catch (EntityDoesNotExistException) {
//                    $this->logger->error("Found undefined url type $key in data");
//                    $name = "Other";
//                }
//            }
//            $data['urls'][] = [ 'name' => $name, 'url' => $value];
//        }


        return $this->renderPage($response,
            self::TEMPLATE_PERSON,
            [
                'personData' => $data,
                'canManageUsers' => $canManageUsers
            ]);
    }

}