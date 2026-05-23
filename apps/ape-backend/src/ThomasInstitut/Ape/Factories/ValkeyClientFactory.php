<?php

namespace ThomasInstitut\Ape\Factories;

use Predis\Client;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\Ape\Config\SystemConfig;

class ValkeyClientFactory
{
    public static function create(ContainerInterface $ci): Client
    {
        $systemConfig = $ci->get(SystemConfig::class);
//        $logger = $ci->get(LoggerInterface::class);
        $host = $systemConfig->valkey->host;
        $port = $systemConfig->valkey->port;
//        $logger->info("Connecting to valkey at $host:$port");
        return new Client([
            'scheme' => 'tcp',
            'host' => $host,
            'port' => $port
        ]);
    }
}