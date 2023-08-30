<?php

namespace APM\Api;


use APM\System\ApmContainerKey;
use APM\System\SystemManager;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;

abstract class ApiProxy implements LoggerAwareInterface, CodeDebugInterface
{
    use LoggerAwareTrait;
    use CodeDebugWithLoggerTrait;

    private SystemManager $systemManager;
    private ContainerInterface $container;

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
        $this->logger = $this->systemManager->getLogger();

    }

    abstract public function proxyCall(Request $request, Response $response, $args);

}