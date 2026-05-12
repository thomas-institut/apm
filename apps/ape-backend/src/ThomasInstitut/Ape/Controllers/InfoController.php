<?php

namespace ThomasInstitut\Ape\Controllers;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\Ape\Actions\GetBackendInfoAction;
use ThomasInstitut\Ape\ApiSchema\GetBackendInfoApiResponse;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\Profiler\SystemProfiler;

class InfoController extends ApiController
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getBackendInfo(Request $request, Response $response): Response
    {
        $this->setApiCallName(__FUNCTION__);
        SystemProfiler::lap('Setup Ready');
        $action = new GetBackendInfoAction($this->container->get(SystemConfig::class));
        $backendInfo = $action->execute();
        SystemProfiler::lap('Server Info Ready');
        $apiResponse = new GetBackendInfoApiResponse();
        $apiResponse->backendInfo = $backendInfo;
        return $this->responseFactory->success($response, $apiResponse);
    }
}
