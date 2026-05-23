<?php

namespace ThomasInstitut\Ape\Factories;

use Predis\Client;
use ThomasInstitut\Ape\Config\SystemConfig;

class ValkeyClientFactory
{
    public static function create(SystemConfig $systemConfig): Client
    {
        $host = $systemConfig->valkey->host;
        $port = $systemConfig->valkey->port;
        return new Client([
            'scheme' => 'tcp',
            'host' => $host,
            'port' => $port
        ]);
    }
}