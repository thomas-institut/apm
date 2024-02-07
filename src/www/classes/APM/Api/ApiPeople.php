<?php

// This should return a json file as an API response

namespace APM\Api;

use APM\System\Person\InvalidPersonNameException;
use APM\System\Person\PersonNotFoundException;
use APM\ToolBox\HttpStatus;
use PHPUnit\Util\Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\TimeString;

class ApiPeople extends ApiController
{

    public function getPersonEssentialData(Request $request, Response $response): Response {
        $this->profiler->start();
        $personTid =  (int) $request->getAttribute('tid');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . Tid::toBase36String($personTid));

        $pm = $this->systemManager->getPersonManager();

        try {
            $data = $pm->getPersonEssentialData($personTid);
        } catch (PersonNotFoundException $e) {
            $this->logger->info("Person does not exist: $personTid");
            $this->logProfilers('errorEncountered');
            return $this->responseWithStatus($response, 404);
        }
        $this->logProfilers('normalFinish');
        return $this->responseWithJson($response, $data->getExportObject());
    }

    public function getAllPeopleEssentialData(Request $request, Response $response): Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ );
        $pm = $this->systemManager->getPersonManager();

        $data = $pm->getAllPeopleEssentialData();

        $dataToServe = [];
        foreach($data as $essentialData) {
            $dataToServe[] = $essentialData->getExportObject();
        }

        return $this->responseWithJson($response, $dataToServe);
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
            $tid = $pm->createPerson($name, $sortName);
        } catch (InvalidPersonNameException $e) {
            $this->logger->error("Invalid name creating person");
            return $this->responseWithJson($response, [ 'errorMsg' => 'Invalid name' ], HttpStatus::BAD_REQUEST);
        }

        // the person has been created
        return $this->responseWithJson($response, [ 'tid' => $tid ], HttpStatus::SUCCESS);


    }

}