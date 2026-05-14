<?php

namespace APM\System\Factories;

use APM\System\ApmContainerKey;
use APM\System\ApmSystemManager;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class ApmSystemManagerFactory
{

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $container): ApmSystemManager
    {
        return new ApmSystemManager($container->get(ApmContainerKey::CONFIG_ARRAY));
    }
}