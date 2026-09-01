<?php

namespace APM\System\Factories;

use APM\System\ApmTableNames;
use APM\System\Cache\SystemMainDataCache;
use APM\System\User\ApmUserManager;
use APM\System\User\UserManagerInterface;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class UserManagerFactory
{

    public static function create(PdoProvider $pdoProvider, ApmTableNames $tableNames, SystemMainDataCache $systemDataCache): UserManagerInterface
    {
        return new ApmUserManager(
            new MySqlDataTable($pdoProvider, $tableNames->users, false),
            new MySqlDataTable($pdoProvider, $tableNames->tokens, true),
            $systemDataCache,
            'ApmUM_'
        );
    }

}