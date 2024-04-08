<?php

// This should return a json file as an API response

namespace APM\Api;

use APM\System\Person\InvalidPersonNameException;
use APM\System\Person\PersonManagerInterface;
use APM\System\Person\PersonNotFoundException;
use APM\System\SystemManager;
use APM\System\User\UserNotFoundException;
use APM\System\User\UserTag;
use APM\ToolBox\HttpStatus;
use PHPUnit\Event\Telemetry\System;
use PHPUnit\Util\Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\Exportable\ExportableObject;
use ThomasInstitut\TimeString\TimeString;

class ApiPeople extends ApiController
{

    const AllPeopleDataForPeoplePageCacheKey = 'ApiPeople_AllPeopleDataForPeoplePage';
    const AllPeopleDataForPeoplePageTtl = 8 * 24 * 3600;

    public function getPersonEssentialData(Request $request, Response $response): Response {
        $this->profiler->start();
        $personTid =  (int) $request->getAttribute('tid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . Tid::toBase36String($personTid));

        $pm = $this->systemManager->getPersonManager();

        try {
            $data = $pm->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException) {
            $this->logger->info("Person does not exist: $personTid");
            $this->logProfilers('errorEncountered');
            return $this->responseWithStatus($response, 404);
        }
        $this->logProfilers('normalFinish');
        try {
            if ($data->isUser && !$this->systemManager->getUserManager()->isUserAllowedTo($this->apiUserTid, UserTag::MANAGE_USERS)) {
                $data->userEmailAddress = "N/A";
                $data->userName = 'N/A';
                $data->userTags = [];
            }
        } catch (UserNotFoundException) {
            // should never happen
            $this->logger->error("User not found: $this->apiUserTid");
            return $this->responseWithStatus($response, HttpStatus::INTERNAL_SERVER_ERROR);
        }
        return $this->responseWithJson($response, $data->getExportObject());
    }

    public function getAllPeopleDataForPeoplePage(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );
        $cache = $this->systemManager->getSystemDataCache();
        try {
            return $this->responseWithJson($response, unserialize($cache->get(self::AllPeopleDataForPeoplePageCacheKey)));
        } catch (KeyNotInCacheException) {
            $dataToServe = self::buildAllPeopleDataForPeoplePage($this->systemManager->getPersonManager());
            $cache->set(self::AllPeopleDataForPeoplePageCacheKey, serialize($dataToServe), self::AllPeopleDataForPeoplePageTtl);
            return $this->responseWithJson($response, $dataToServe);
        }
    }

    public static function buildAllPeopleDataForPeoplePage(PersonManagerInterface $pm) : array {
        $data = $pm->getAllPeopleEssentialData();
        $dataToServe = [];
        foreach($data as $essentialData) {
            $dataToServe[] = $essentialData->getExportObject();
        }
        return $dataToServe;
    }

    public static function updateCachedAllPeopleDataForPeoplePage(SystemManager $systemManager) : bool {
        try {
            $data = self::buildAllPeopleDataForPeoplePage($systemManager->getPersonManager());
            $systemManager->getSystemDataCache()->set(self::AllPeopleDataForPeoplePageCacheKey,
                serialize($data), self::AllPeopleDataForPeoplePageTtl);
        } catch (\Exception $e) {
            $systemManager->getLogger()->error("Exception while updating cached AllPeopleEssentialData",
                [
                    'code' => $e->getCode(),
                    'msg' => $e->getMessage()
                ]);
            return false;
        }
        return true;
    }

    public function getWorks(Request $request, Response $response): Response {
        $this->profiler->start();
        $personTid =  (int) $request->getAttribute('tid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . Tid::toBase36String($personTid));

        try {
            $this->systemManager->getPersonManager()->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException) {
            $this->logger->info("Person $personTid not found");
            return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
        }
        $works = $this->systemManager->getWorkManager()->getWorksByAuthor($personTid);

        return $this->responseWithJson($response, [ 'tid' => $personTid, 'works' => ExportableObject::getArrayExportObject($works)]);
    }


    public function createNewPerson(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );


        $inputData = $this->checkAndGetInputData($request, $response, [ 'name', 'sortName'], true, true);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $name = $inputData['name'];
        $sortName = $inputData['sortName'];

        $pm = $this->systemManager->getPersonManager();

        try {
            $tid = $pm->createPerson($name, $sortName, $this->apiUserTid);
        } catch (InvalidPersonNameException $e) {
            $this->logger->error("Invalid name creating person");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Invalid name' ], HttpStatus::BAD_REQUEST);
        }
        $this->systemManager->onPersonDataChanged($tid);
        // the person has been created
        return $this->responseWithJson($response, [ 'tid' => $tid ], HttpStatus::SUCCESS);

    }

}