<?php

namespace ThomasInstitut\Ape\Controllers;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;

class InfoController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $container)
    {
        $this->logger = $container->get(LoggerInterface::class);
    }

    public function hello(Request $request, Response $response): Response
    {
        $response->getBody()->write("Hello world!");
        return $response;
    }
}
