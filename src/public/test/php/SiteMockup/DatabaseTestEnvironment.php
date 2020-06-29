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
require "autoload.php";

use APM\System\ApmConfigParameter;
use APM\System\ApmContainerKey;
use AverroesProject\Data\DataManager;
use APM\System\ApmSystemManager;
use mysql_xdevapi\Exception;
use PDO;
use Psr\Container\ContainerInterface;
use ThomasInstitut\Container\MinimalContainer;

/**
 * Utility class to set up the test environment for database testing
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseTestEnvironment {
    
    /** @var array */
    protected $config;

    /**
     * @var PDO
     */
    protected $dbConn;

    /**
     * @var ContainerInterface
     */
    protected $container;

    /**
     * @var DataManager
     */
    protected $dataManager;
    /**
     * @var ApmSystemManager
     */
    protected $systemManager;

    public function __construct($apmTestConfig) {
        $this->config = $this->createOptionsArray($apmTestConfig);
        $this->dbConn = false;
        $this->container = false;
        $this->dataManager = false;
        $this->systemManager = false;
    }
    
    public function getPdo() : PDO
    {
        
        if ($this->dbConn !== false) {
            return $this->dbConn;
        }
        $config = $this->config;
        
        $pdo = new PDO('mysql:dbname=' . $config[ApmConfigParameter::DB]['db'] .
                ';host=' . $config[ApmConfigParameter::DB]['host'], $config[ApmConfigParameter::DB]['user'], $config[ApmConfigParameter::DB]['pwd']);
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");
        $this->dbConn = $pdo;
        return $pdo;
    }
    

    /**
     * @return ApmSystemManager
     * @throws \Exception
     */
    public function getSystemManager() : ApmSystemManager {
        return $this->getContainer()->get(ApmContainerKey::SYSTEM_MANAGER);
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

    /**
     * @param $userId
     * @throws \Exception
     */
    public function setUserId($userId) {
        $this->getContainer()->set(ApmContainerKey::USER_ID, $userId);
    }

    /**
     * @return bool|ContainerInterface
     * @throws \Exception
     */
    public function getContainer()
    {
        
        if ($this->container !== false) {
            return $this->container;
        }

        $systemManager = new ApmSystemManager($this->config);

        if ($systemManager->fatalErrorOccurred()) {
            throw new \Exception($systemManager->getErrorMessage());
        }

        $this->systemManager = $systemManager;
        
        $config = $systemManager->getConfig();
        
        
        $dbConnection = $systemManager->getDbConnection();
        $hm = $systemManager->getHookManager();
        $logger = $systemManager->getLogger();
        $dataManager = new DataManager($dbConnection, $systemManager->getTableNames(), $logger, $hm, $config[ApmConfigParameter::LANG_CODES]);
        $systemManager->setDataManager($dataManager);
        $container = new MinimalContainer();
        $container->addDefinitions([
            ApmContainerKey::SYSTEM_MANAGER => $systemManager,
            ApmContainerKey::USER_ID => 0,  // invalid user Ids, must be set downstream for some API and Site operations
            ApmContainerKey::API_USER_ID => 0,
        ]);

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
        $config['collatex_jar_file'] = '../../collatex/bin/collatex-tools-1.7.1.jar';


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

        $config[ApmConfigParameter::TWIG_USE_CACHE] = false;
        $config[ApmConfigParameter::TWIG_TEMPLATE_DIR] = '../../templates';


        return $config;
    }

    /**
     * @param int $userId
     * @throws \Exception
     */
    public function setApiUser(int $userId) {
        $this->getContainer()->set(ApmContainerKey::API_USER_ID, $userId);
    }

}
