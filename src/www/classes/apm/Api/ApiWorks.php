<?php

namespace APM\Api;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ApiWorks extends ApiController
{

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getWorkInfo(Request $request, Response $response): Response
    {
        $apiCall = 'getWorkInfo';
        $this->profiler->start();
        $workId =  $request->getAttribute('workId');
        $dataManager = $this->systemManager->getDataManager();

        $workInfo = $dataManager->getWorkInfo($workId);

        if ($workInfo === false) {
            $this->logger->error("Work '$workId' not found",
                [ 'apiUserId' => $this->apiUserId,
                    'workId' => $workId]);
            return $response->withStatus(409);
        }
        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        return $this->responseWithJson($response,$workInfo);
    }
}