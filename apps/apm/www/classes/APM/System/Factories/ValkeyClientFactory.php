<?php

namespace APM\System\Factories;

use APM\System\ApmContainerKey;
use Predis\Client;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class ValkeyClientFactory
{

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    static public function create(ContainerInterface $ci): Client
    {
        $config = $ci->get(ApmContainerKey::CONFIG_ARRAY);

        $valkeyHost = '127.0.0.1';
        if (isset($config['valkey_host'])) {
            $valkeyHost = $config['valkey_host'];
        }
        $valkeyPort = '6379';
        if (isset($config['valkey_port'])) {
            $valkeyPort = $config['valkey_port'];
        }
        return new Client([
            'scheme' => 'tcp',
            'host' => $valkeyHost,
            'port' => $valkeyPort
        ]);

    }
}