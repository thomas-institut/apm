<?php

namespace APM\HttpProxy;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

interface HttpProxyInterface
{
    /**
     * Proxies a request
     * If the return value is false,
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function proxy(string $cmd, Request $request, Response $response) : Response;

}