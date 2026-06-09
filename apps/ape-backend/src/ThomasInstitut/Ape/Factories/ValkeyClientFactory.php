<?php

namespace ThomasInstitut\Ape\Factories;

use Predis\Client;
use Predis\ClientInterface;
use Psr\Container\ContainerInterface;
//use Psr\Log\LoggerInterface;
use ThomasInstitut\Ape\Config\SystemConfig;

class ValkeyClientFactory
{
    public static function create(ContainerInterface $ci): ClientInterface
    {
        $systemConfig = $ci->get(SystemConfig::class);
        $host = $systemConfig->valkey->host;
        $port = $systemConfig->valkey->port;
        return new Client([
            'scheme' => 'tcp',
            'host' => $host,
            'port' => $port
        ]);
    }
}