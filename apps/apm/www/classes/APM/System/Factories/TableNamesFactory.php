<?php

namespace APM\System\Factories;

use APM\System\ApmContainerKey;
use APM\System\ApmMySqlTableName;
use APM\System\Config\ApmSystemConfig;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class TableNamesFactory
{
    /**
     * @param ContainerInterface $ci
     * @return array<string, string>
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $ci): array {
        /** @var ApmSystemConfig $apmConfig */
        $apmConfig = $ci->get(ApmSystemConfig::class);
        $prefix = $apmConfig->general->dbTablePrefix;

        $tableKeys = [
            ApmMySqlTableName::TABLE_SETTINGS,
            ApmMySqlTableName::TABLE_EDNOTES,
            ApmMySqlTableName::TABLE_ELEMENTS,
            ApmMySqlTableName::TABLE_ITEMS,
            ApmMySqlTableName::TABLE_USERS,
            ApmMySqlTableName::TABLE_TOKENS,
            ApmMySqlTableName::TABLE_PAGES,
            ApmMySqlTableName::TABLE_WORKS,
            ApmMySqlTableName::TABLE_PRESETS,
            ApmMySqlTableName::TABLE_VERSIONS_TX,
            ApmMySqlTableName::TABLE_SYSTEM_CACHE,
            ApmMySqlTableName::TABLE_COLLATION_TABLE,
            ApmMySqlTableName::TABLE_VERSIONS_CT,
            ApmMySqlTableName::TABLE_MULTI_CHUNK_EDITIONS,
            ApmMySqlTableName::ES_Statements_Default,
            ApmMySqlTableName::ES_Cache_Default,
            ApmMySqlTableName::ES_Merges,
        ];

        $tables = [];
        foreach ($tableKeys as $table) {
            $tables[$table] = $prefix . $table;
        }
        return $tables;
    }
}