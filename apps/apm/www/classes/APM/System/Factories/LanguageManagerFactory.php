<?php

namespace APM\System\Factories;

use APM\System\ApmLanguageManager;
use APM\System\LanguageManager;
use APM\System\SystemManager;

class LanguageManagerFactory
{
    public static function create(SystemManager $sm): LanguageManager
    {
        return new ApmLanguageManager($sm->getEntitySystem());
    }
}