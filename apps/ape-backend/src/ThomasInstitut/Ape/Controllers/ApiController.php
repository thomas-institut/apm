<?php

namespace ThomasInstitut\Ape\Controllers;


use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\StandardApi\ApiResponseFactory;

class ApiController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    protected ContainerInterface $container;
    protected ApiResponseFactory $responseFactory;

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
}