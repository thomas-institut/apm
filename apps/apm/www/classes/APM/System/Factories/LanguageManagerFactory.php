<?php

namespace APM\System\Factories;

use APM\System\LanguageManager;
use APM\System\SystemManager;
use APM\System\ApmLanguageManager;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class LanguageManagerFactory
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $cit): LanguageManager
    {
        $sm = $cit->get(SystemManager::class);
        return new ApmLanguageManager($sm->getEntitySystem());
    }
}