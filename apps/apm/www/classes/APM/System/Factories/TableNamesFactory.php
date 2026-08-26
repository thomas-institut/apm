<?php

namespace APM\System\Factories;

use APM\System\ApmTableNames;
use APM\System\Config\ApmSystemConfig;

class TableNamesFactory
{
    public static function create(ApmSystemConfig $apmConfig): ApmTableNames
    {
        return new ApmTableNames($apmConfig->general->dbTablePrefix);
    }
}