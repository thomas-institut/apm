<?php

namespace ThomasInstitut\Ape\Controllers;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\Ape\Actions\GetServerInfo;
use ThomasInstitut\Ape\ApiSchema\GetServerInfoResponse;
use ThomasInstitut\Ape\Config\SystemConfig;

class InfoController extends ApiController
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getServerInfo(Request $request, Response $response): Response
    {
        $action = new GetServerInfo($this->container->get(SystemConfig::class));
        $serverInfo = $action->execute();
        $serverInfoResponse = new GetServerInfoResponse();
        $serverInfoResponse->serverInfo = $serverInfo;
        return $this->responseFactory->success($response, $serverInfoResponse);
    }
}
