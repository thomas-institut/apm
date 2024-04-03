<?php

namespace APM\Api;

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\EntitySystem\StandardNames;
use ThomasInstitut\EntitySystem\Tid;

class ApiEntity extends ApiController
{

    public function getEntityData(Request $request, Response $response): Response {
        $tid = Tid::fromString($request->getAttribute('tid'));
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':'  . $tid);

        try {
            $data = $this->systemManager->getEntitySystem()->getEntityData($tid);
        } catch (EntityDoesNotExistException $e) {
            $this->logger->info("Entity $tid not found");
            return $this->responseWithStatus($response, HttpStatus::NOT_FOUND);
        }
        return $this->responseWithJson($response, $data);
    }


    public function getEntitySchema(Request $request, Response $response): Response {

        $entityType = $request->getAttribute('entityType');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':'  . $entityType);
        if ($entityType !== StandardNames::TYPE_PERSON) {
            $this->logger->info("Invalid entity type: $entityType");
            return $this->responseWithStatus($response, HttpStatus::BAD_REQUEST);
        }

        // Person Schema
        $data = [
            'entityType' => StandardNames::TYPE_PERSON,
            'entityTypeTid' => -1,
            'schema' => [
                'name' => [ 'type' => 'string', 'constraints' => [ 'NotEmpty'] ],
                'sortName' => ['type' => 'string', 'constraints' => [ 'NotEmpty']
                ]
            ]
        ];

        return $this->responseWithJson($response, $data);

    }

}