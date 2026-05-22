<?php

namespace APM\System\Factories;

use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use CuyZ\Valinor\Mapper\MappingError;
use CuyZ\Valinor\MapperBuilder;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class ApmSystemConfigFactory
{
    /**
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     * @throws MappingError
     */
    public static function create(ContainerInterface $ci) : ApmSystemConfig {
        $configArray = $ci->get(ApmContainerKey::CONFIG_ARRAY);
        $configArray['general'] = $configArray;

        return (new MapperBuilder())
            ->allowSuperfluousKeys()
            ->mapper()
            ->map(ApmSystemConfig::class, $configArray);
    }
}