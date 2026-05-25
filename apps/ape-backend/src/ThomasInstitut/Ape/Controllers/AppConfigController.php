<?php

namespace ThomasInstitut\Ape\Controllers;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\Ape\Actions\GetAppConfigAction;
use ThomasInstitut\Ape\ApiSchema\GetAppConfigApiResponse;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\Profiler\SystemProfiler;

class AppConfigController extends ApiController
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function get(Request $request, Response $response): Response
    {
        $this->setApiCallNameFromClassFunction(__CLASS__, __FUNCTION__);
        $action = new GetAppConfigAction($this->container->get(SystemConfig::class));
        $appConfig = $action->execute();
        SystemProfiler::lap('Server Info Ready');
        $apiResponse = new GetAppConfigApiResponse();
        $apiResponse->appConfig = $appConfig;
        return $this->responseFactory->success($response, $apiResponse);
    }
}
