<?php

namespace ThomasInstitut\Ape\Factories;

use Predis\ClientInterface;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\Ape\Managers\ValkeyPublicationManager;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;

class PublicationManagerFactory
{

    /**
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public static function create(ContainerInterface $ci): PublicationManager
    {
        $valkeyClient = $ci->get(ClientInterface::class);
        $logger = $ci->get(LoggerInterface::class);
        $apiClient = $ci->get(PublicationApiClient::class);

        return new ValkeyPublicationManager($valkeyClient, $apiClient, $logger);
    }
}