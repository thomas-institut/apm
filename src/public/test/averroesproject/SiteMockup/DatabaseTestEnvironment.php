<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace AverroesProject;
require "../vendor/autoload.php";
require '../test/testdbconfig.php';

use AverroesProject\Data\DataManager;
use APM\Plugin\HookManager;

/**
 * Utility class to set up the test environment for database testing
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseTestEnvironment {
    
    public static function getPdo()
    {
        global $config;
        
        $pdo = new \PDO(
                'mysql:dbname=' . $config['db'] .';host=' . $config['host'], 
                $config['user'], 
                $config['pwd'],
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
                );
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");
        return $pdo;
    }
    
    public static function getDataManager($logger, $hm)
    {   
        global $config;

        return new DataManager(self::getPdo(), 
                $config['tables'], 
                $logger,
                $hm, $config['langCodes']);
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
                DELETE FROM ap_relations;
                DELETE FROM ap_presets;
                DELETE FROM ap_users;
                DELETE FROM ap_people;
                DELETE FROM ap_hands;
                INSERT INTO `ap_hands` (`id`, `name`, `description`) VALUES
(0, 'Unknown', 'Unknown hand');
EOD;
       $dbConn->query($query);
        
    }
    
    public static function getContainer($logger)
    {
        global $config;
        
        $dbh = self::getPdo();
        $hm = new HookManager();
        $db = new DataManager($dbh, $config['tables'], $logger, $hm, $config['langCodes']);
        
        $container = new \Slim\Container();
        $container['db'] = $db;
        //$container['dbh'] = $dbh;
        $container['logger'] = $logger;
        $container['userId'] = 50100100;
        $container['hm'] = $hm;
        return $container;
    }
}
