<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject;
require "../vendor/autoload.php";
require 'testdbconfig.php';

use AverroesProject\Data\DataManager;

/**
 * Utility class to set up the test environment for database testing
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseTestEnvironment {
    
    public static function getPdo()
    {
        global $config;
        
        $pdo = new \PDO('mysql:dbname=' . $config['db'] .
                ';host=' . $config['host'], $config['user'], $config['pwd']);
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");
        return $pdo;
    }
    
    public static function getDataManager($logger)
    {   
        global $config;

        return new DataManager(self::getPdo(), 
                $config['tables'], 
                $logger);
    }
    
    
    public static function emptyDatabase()
    {
        $dbConn = DatabaseTestEnvironment::getPdo();
        
        // Can't TRUNCATE because of foreign keys
        $query = <<<EOD
                DELETE FROM ap_ednotes;
                DELETE FROM ap_items;
                DELETE FROM ap_elements;
                DELETE FROM ap_pages;
                DELETE FROM ap_docs;
EOD;
        $dbConn->query($query);
        
    }
    
    public static function getContainer($logger)
    {
        global $config;
        
        $dbh = self::getPdo();
        $db = new DataManager($dbh, $config['tables'], $logger);
        
        $container = new \Slim\Container();
        $container['db'] = $db;
        //$container['dbh'] = $dbh;
        $container['logger'] = $logger;
        return $container;
    }
}
