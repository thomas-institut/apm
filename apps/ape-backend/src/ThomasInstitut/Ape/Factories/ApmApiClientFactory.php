<?php

namespace ThomasInstitut\Ape\Factories;

use GuzzleHttp\Client;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ApmPublicationApi\PublicationApiClient;

class ApmApiClientFactory
{
    public static function create(SystemConfig $systemConfig): PublicationApiClient
    {
        $guzzleClient = new Client([
            'base_uri' => $systemConfig->apm->apiUrl,
            'headers' => [
                'Authorization' => 'Bearer ' . $systemConfig->apm->token,
            ],
        ]);

        return new PublicationApiClient($guzzleClient);
    }
}