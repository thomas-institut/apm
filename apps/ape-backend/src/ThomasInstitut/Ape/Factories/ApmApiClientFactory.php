<?php

namespace ThomasInstitut\Ape\Factories;

use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use GuzzleHttp\Client;
use GuzzleHttp\Psr7\HttpFactory;
use Psr\Log\LoggerInterface;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;

class ApmApiClientFactory
{
    /**
     * @throws DependencyException
     * @throws NotFoundException
     */
    public static function create(Container $ci): PublicationApiClient
    {
        $systemConfig = $ci->get(SystemConfig::class);
        $logger = null;
        if ($systemConfig->apm->debugPublicationApi) {
            try {
                $logger = $ci->get(LoggerInterface::class);
            } catch (NotFoundException $e) {
            }
        }

        $httpClient = new Client();
        $requestFactory = new HttpFactory();
        $baseUrl = $systemConfig->apm->apiUrl;
        if ($logger !== null) {
            return new PublicationApiClient($httpClient, $requestFactory, $baseUrl, $logger, true);
        }
        return new PublicationApiClient($httpClient, $requestFactory, $baseUrl);
    }
}