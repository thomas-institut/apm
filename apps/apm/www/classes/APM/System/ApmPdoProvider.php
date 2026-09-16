<?php

namespace APM\System;

use APM\System\Config\ApmSystemConfig;
use APM\System\Config\DbConfig;
use APM\ToolBox\Resettable;
use Exception;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use RuntimeException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class ApmPdoProvider implements PdoProvider, Resettable
{
    const int DB_VERSION = 38; // updated 2026-05-05
    private ?PDO $pdo = null;
    private bool $dbHasBeenChecked = false;
    private SettingsManager $settingsMgr;

    public function __construct(private readonly ContainerInterface $container)
    {
    }

    public function getPdo(): PDO
    {
        $pdo = $this->getPdoWithoutCheck();
        if (!$this->dbHasBeenChecked) {
            $this->checkDatabase();
            $this->dbHasBeenChecked = true;
        }
        return $pdo;
    }

    public function reset(): void
    {
        $this->pdo = null;
    }

    private function getPdoWithoutCheck(): PDO
    {
        if ($this->pdo === null) {
            /** @var ApmSystemConfig $apmConfig */
            try {
                $apmConfig = $this->container->get(ApmSystemConfig::class);
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
                throw new RuntimeException("Could not get ApmSystemConfig: " . $e->getMessage(), $e->getCode(), $e);
            }
            $this->pdo = $this->buildPdo($apmConfig->db);
        }
        return $this->pdo;
    }

    private function buildPdo(DbConfig $dbConfig): PDO
    {
        $pdo = new PDO("mysql:dbname=$dbConfig->db;host=$dbConfig->host:$dbConfig->port", $dbConfig->user, $dbConfig->pwd);
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");
        return $pdo;
    }

    private function checkDatabase(): void
    {
        // Check that the database is initialized
        if (!$this->isDatabaseInitialized()) {
            throw new RuntimeException("Database not initialized");
        }
        // Set up SettingsManager
        try {
            $settingsTable = new MySqlDataTable($this->getPdoWithoutCheck(), $this->getTableNames()->settings);
        } catch (Exception $e) {
            throw new RuntimeException("Cannot read settings from database", $e->getCode(), $e);
        }

        $this->settingsMgr = new SettingsManager($settingsTable);

        // Check that the database is up to date
        if (!$this->isDatabaseUpToDate()) {
            throw new RuntimeException("Database not up to date");
        }
    }


    private function isDatabaseInitialized(): bool
    {

        $actualTableNames = get_object_vars($this->getTableNames());
        // Check that all tables exist
        foreach ($actualTableNames as $table) {
            if (!$this->tableExists($table)) {
                return false;
            }
        }
        return true;
    }

    protected function isDatabaseUpToDate(): bool
    {
        $dbVersion = $this->settingsMgr->getSetting('DatabaseVersion');
        if ($dbVersion === false) {
            return false; // @codeCoverageIgnore
        }
        return intval($dbVersion) === self::DB_VERSION;
    }

    private function tableExists($tableName): bool
    {
        $r = $this->getPdoWithoutCheck()->query("show tables like '" . $tableName . "'");
        if ($r === false) {
            // This is reached only if the query above has a mistake,
            throw new RuntimeException("Could not check if table '$tableName' exists, query failed"); // @codeCoverageIgnore
        }
        if ($r->fetch()) {
            return true;
        }
        return false;
    }


    public function getTableNames(): ApmTableNames
    {
        try {
            return $this->container->get(ApmTableNames::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("Could not get table names: " . $e->getMessage(), $e->getCode(), $e);
        }
    }

}