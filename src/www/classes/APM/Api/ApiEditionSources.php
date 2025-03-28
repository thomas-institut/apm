<?php

namespace APM\Api;

use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\EntitySystem\Tid;

class ApiEditionSources extends ApiController
{

    const string CLASS_NAME = 'EditionSources';

    public function getAllSources(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $mgr = $this->systemManager->getEditionSourceManager();
        $data = $mgr->getAllSources();
        return $this->responseWithJson($response, $data);
    }

    public function getSourceByTid(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $tidString = $request->getAttribute('tid');
        $tid = Tid::fromString($tidString);

        if ($tid === -1) {
            $this->logger->error("Given tid  '$tidString' is not valid");
            return $this->responseWithJson($response,  [
                'tid' => $tidString,
                'message' => 'Tid not valid'
            ], 400);
        }

        $mgr = $this->systemManager->getEditionSourceManager();
        try {
            $data = $mgr->getSourceByTid($tid);
        } catch (InvalidArgumentException $e) {
            $this->logger->error("Source with tid '$tidString' not found", [ 'error' => $e->getMessage()]);
            return $this->responseWithJson($response,  [
                'tidString' => $tidString,
                'tid' => $tid,
                'message' => 'Not found'
            ], 404);
        }

        return $this->responseWithJson($response, $data);
    }


}