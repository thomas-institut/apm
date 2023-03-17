<?php

namespace APM\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\UUID\Uuid;

class ApiEditionSources extends ApiController
{

    const CLASS_NAME = 'EditionSources';

    public function getAllSources(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $mgr = $this->systemManager->getEditionSourceManager();
        $data = $mgr->getAllSources();
        return $this->responseWithJson($response, $data);
    }

    public function getSourceByUuid(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $uuid = $request->getAttribute('uuid');

        if (!Uuid::isValidUuidString($uuid)) {
            $this->logger->error("Given UUID  '$uuid' is not valid");
            return $this->responseWithJson($response,  [
                'uuid' => $uuid,
                'message' => 'UUID not valid'
            ], 400);
        }

        $mgr = $this->systemManager->getEditionSourceManager();
        try {
            $data = $mgr->getSourceInfoByUuid($uuid);
        } catch (\InvalidArgumentException $e) {
            $this->logger->error("Source with UUID  '$uuid' not found", [ 'error' => $e->getMessage()]);
            return $this->responseWithJson($response,  [
                'uuid' => $uuid,
                'message' => 'Not found'
            ], 404);
        }

        return $this->responseWithJson($response, $data);
    }


}