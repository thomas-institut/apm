<?php

namespace APM\System\Factories;

use APM\System\Config\ApmSystemConfig;
use APM\System\Config\DbConfig;
use APM\ToolBox\ResettablePdoProvider;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class PdoProviderFactory
{
    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $ci) : PdoProvider {
        /** @var ApmSystemConfig $apmConfig */
        $apmConfig = $ci->get(ApmSystemConfig::class);
        $dbConfig = $apmConfig->db;
        return new ResettablePdoProvider([self::class, 'getDbConnection'], $dbConfig);
    }

    /**
     * @param DbConfig $dbConfig
     * @return PDO
     */
    public static  function getDbConnection(DbConfig $dbConfig): PDO
    {
        $dbh = new PDO('mysql:dbname='. $dbConfig->db . ';host=' .
            $dbConfig->host . ':3306', $dbConfig->user,
            $dbConfig->pwd);
        $dbh->query("set character set 'utf8'");
        $dbh->query("set names 'utf8'");

        return $dbh;
    }
}