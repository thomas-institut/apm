<?php

namespace ThomasInstitut\Ape\Controllers;


use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\ApiResponseFactory\ApiResponseFactory;

class ApiController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    protected ContainerInterface $container;
    protected ApiResponseFactory $responseFactory;
    protected string $apiCallName = '';

    public function __construct(ContainerInterface $container)
    {
        $this->container = $container;
        try {
            $this->logger = $container->get(LoggerInterface::class);
        } catch (ContainerExceptionInterface) {
            $this->logger = new NullLogger();
        }
        $this->responseFactory = new ApiResponseFactory($this->logger);
    }
    public function setApiCallName(string $name): void
    {
        $this->apiCallName = $name;
        $this->responseFactory->withApiCallName($name);
    }

    public function setApiCallNameFromClassFunction(string $className, string $functionName): void
    {
        $className = array_slice(explode('\\', $className), -1, 1);
        $this->setApiCallName(implode(':', [$className[0], $functionName]));
    }
}