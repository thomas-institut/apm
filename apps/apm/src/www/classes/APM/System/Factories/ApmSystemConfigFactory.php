<?php

namespace APM\System\Factories;

use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;

class ApmSystemConfigFactory
{
    /**
     * @throws NotFoundExceptionInterface
     * @throws WrongValueTypeException
     * @throws ContainerExceptionInterface
     * @throws MissingRequiredValueException
     */
    public static function create(ContainerInterface $ci) : ApmSystemConfig {

        $config = new ApmSystemConfig();
        $config->fromArray($ci->get(ApmContainerKey::CONFIG_ARRAY));
        return $config;
    }
}