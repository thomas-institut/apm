<?php

namespace ThomasInstitut\Ape\Factories;

use Predis\Client;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\Ape\Managers\ValkeyPublicationManager;

class PublicationManagerFactory
{

    public static function create(ContainerInterface $ci): PublicationManager
    {
        $valkeyClient = $ci->get(Client::class);
        $logger = $ci->get(LoggerInterface::class);
        $apiClient = $ci->get(ApmApiClientFactory::class);

        return new ValkeyPublicationManager($valkeyClient, $apiClient, $logger);
    }
}