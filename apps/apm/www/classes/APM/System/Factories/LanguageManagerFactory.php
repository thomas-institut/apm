<?php

namespace APM\System\Factories;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\ApmLanguageManager;
use APM\System\LanguageManager;

class LanguageManagerFactory
{
    public static function create(ApmEntitySystemInterface $es): LanguageManager
    {
        return new ApmLanguageManager($es);
    }
}