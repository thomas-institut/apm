<?php

namespace APM\System\Factories;

use APM\System\ApmTableNames;
use APM\System\Config\ApmSystemConfig;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class TableNamesFactory
{
       /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $ci): ApmTableNames
    {
        /** @var ApmSystemConfig $apmConfig */
        $apmConfig = $ci->get(ApmSystemConfig::class);
        $prefix = $apmConfig->general->dbTablePrefix;
        return new ApmTableNames($prefix);
    }
}