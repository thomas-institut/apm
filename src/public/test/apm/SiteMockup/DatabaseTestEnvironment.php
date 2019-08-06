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

namespace APM;
require "../vendor/autoload.php";

use AverroesProject\Data\DataManager;
use APM\System\ApmSystemManager;
use mysql_xdevapi\Exception;

/**
 * Utility class to set up the test environment for database testing
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseTestEnvironment {
    
    /** @var array */
    protected $config;
    
    protected $dbConn;
    
    protected $container;
    
    protected $dataManager;
    
    public function __construct($apmTestConfig) {
        $this->config = $this->createOptionsArray($apmTestConfig);
        $this->dbConn = false;
        $this->container = false;
        $this->dataManager = false;
    }
    
    public function getPdo()
    {
        
        if ($this->dbConn !== false) {
            return $this->dbConn;
        }
        $config = $this->config;
        
        $pdo = new \PDO('mysql:dbname=' . $config['db']['db'] .
                ';host=' . $config['db']['host'], $config['db']['user'], $config['db']['pwd']);
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");
        $this->dbConn = $pdo;
        return $pdo;
    }
    
    
    
    public function getDataManager()
    {   
        return $this->container->db;
    }
    
    
    public function emptyDatabase()
    {
        $dbConn = $this->getPdo();
        
        // Can't TRUNCATE because of foreign keys
        $query = <<<EOD
                DELETE FROM ap_versions_tx;
                DELETE FROM ap_ednotes;
                DELETE FROM ap_items;
                DELETE FROM ap_elements;
                DELETE FROM ap_pages;
                DELETE FROM ap_docs;
                DELETE FROM ap_relations;
                DELETE FROM ap_presets;
                DELETE FROM ap_users;
                DELETE FROM ap_people;
                INSERT INTO `ap_hands` (`id`, `name`, `description`) VALUES
(0, 'Unknown', 'Unknown hand');
EOD;
        $result = $dbConn->query($query);
        if ($result === false) {
            throw new Exception('Error in MySQL query trying to empty the database for testing');
        }

    }

    public function setUserId($userId) {
        $this->container['userId'] = $userId;
    }
    
    public function getContainer()
    {
        
        if ($this->container !== false) {
            return $this->container;
        }
        
        
        $sm = new ApmSystemManager($this->config);
        
        $config = $sm->getConfig();
        
        
        $dbh = $sm->getDbConnection();
        $hm = $sm->getHookManager();
        $logger = $sm->getLogger();
        $cr = $sm->getCollationEngine();
        $dataManager = new DataManager($dbh, $sm->getTableNames(), $logger, $hm, $config['langCodes']);
        
        $container = new \Slim\Container();
        $container['db'] = $dataManager;
        $container['dbh'] = $dbh;
        $container['cr'] = $cr;
        $container['logger'] = $logger;
        $container['userId'] = 50100100;
        $container['hm'] = $hm;
        $container['sm'] = $sm;
        
        $container['config'] = $config;
        $container['settings'] = $config;
        
        
        $this->container = $container;
        return $container;
    }
    
    protected function createOptionsArray($config) : array {
        // This function will create or overwrite
        // configuration options in the given $config
        // array, except for database connection information
        
        // SUPPORT
        $config['support_contact_name'] = 'John Doe';
        $config['support_contact_email'] = 'john@doe.com';

//            // DATABASE ACCESS
//            // should be in $config array already!
//            $config['db']['host'] = "";
//            $config['db']['user'] = "";
//            $config['db']['pwd'] = "";
//            $config['db']['db'] ="";

        // BASE URL
        $config['baseurl']='localhost://';

        // TIME ZONE
        $config['default_timezone'] = "Europe/Berlin";

        // SLIM ERROR HANDLING
        // Might be set to false in production
        $config['displayErrorDetails'] = true;

        // LOG FILE  
        // The web server user should be able to create and write to the given file
        $config['log_filename'] = 'test.log';
        $config['log_include_debug_info'] = true;
        $config['log_in_php_error_handler'] = false;

        // LANGUAGES
        $config['languages'] = [
            [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
            [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
            [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3], 
            [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3] 
        ];

        // COLLATEX
        $config['collatex_temp_dir'] = '/tmp';
        //$config['java_executable'] = '/usr/bin/java';
        $config['collatex_jar_file'] = '../collatex/bin/collatex-tools-1.7.1.jar';


        // PLUGINS
        // a plugin named 'PluginName' must be implemented as
        // a class with the fully qualified name '\PluginName' and its
        // code must reside in  ./plugins/PluginName.php


        $config['addContentLengthHeader'] = false;

        $config['plugin_dir'] = 'apm/test-plugins';

        $config['loggerAppName'] = 'APM';

        // Generate langCodes
        $config['langCodes'] = [];
        foreach ($config['languages'] as $lang) {
            $config['langCodes'][] = $lang['code'];
        }
        
        $config['app_name'] = 'Averroes Project Manager (test)';
        $config['version'] = '(develop)';


        $config['copyright_notice'] = '(C) Thomas Institut';    


        return $config;
    }
}
