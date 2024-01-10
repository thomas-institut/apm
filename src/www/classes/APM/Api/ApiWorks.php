<?php

namespace APM\Api;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiWorks extends ApiController
{

    const CLASS_NAME = 'Works';
    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getWorkInfo(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $workId =  $request->getAttribute('workId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $workId);
        $dataManager = $this->systemManager->getDataManager();

        $workInfo = $dataManager->getWorkInfo($workId);


        if ($workInfo === false) {
            $this->logger->error("Work '$workId' not found",
                [ 'apiUserId' => $this->apiUserId,
                    'workId' => $workId]);
            return $this->responseWithStatus($response, 409);
        }
        return $this->responseWithJson($response,$workInfo);
    }
}