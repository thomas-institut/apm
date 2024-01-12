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

namespace Test\APM\Mockup;

use APM\System\ApmConfigParameter;
use APM\System\ApmContainerKey;
use APM\System\Person\InvalidPersonNameException;
use APM\System\User\InvalidUserNameException;
use APM\System\User\UserNameAlreadyInUseException;
use APM\SystemProfiler;
use AverroesProject\Data\DataManager;
use APM\System\ApmSystemManager;
use Exception;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\Container\MinimalContainer;


require_once  __DIR__ .  "./../../test.config.php";

/**
 * Utility class to set up the test environment for database testing
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseTestEnvironment {
    
    protected array $config;
    protected ?PDO $dbConn;
    protected ?ContainerInterface $container;
    protected ?DataManager $dataManager;
    protected ?ApmSystemManager $systemManager;

    public function __construct() {
        global $testConfig;
        $this->config = $this->createConfig($testConfig);
        $this->dbConn = null;
        $this->container = null;
        $this->dataManager = null;
        $this->systemManager = null;
        SystemProfiler::start();
    }
    
    public function getPdo() : PDO
    {
        
        if ($this->dbConn !== null) {
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



    public function getSystemManager() : ApmSystemManager {
        return $this->systemManager;
    }

    public function createUserByUserName(string $userName) : int {
        $userManager = $this->getSystemManager()->getUserManager();
        $personManager = $this->getSystemManager()->getPersonManager();
        try {
            $userTid = $personManager->createPerson($userName, $userName);
        } catch (InvalidPersonNameException) {
            return -1;
        }
        try {
            $userManager->createUser($userTid, $userName);
        } catch (InvalidUserNameException|UserNameAlreadyInUseException) {
            return -1;
        }
        return $userTid;
    }

    /**
     * @throws Exception
     * @noinspection SqlWithoutWhere
     */
    public function emptyDatabase(): void
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
        $dbConn->query($query);
//        if ($result === false) {
//            throw new Exception('Error in MySQL query trying to empty the database for testing');
//        }

    }

    /**
     * @param $userTid
     * @throws Exception
     */
    public function setUserTid($userTid) : void {
        $this->getContainer()->set(ApmContainerKey::USER_TID, $userTid);
    }

    /**
     * @return ContainerInterface
     * @throws Exception
     */
    public function getContainer() : ContainerInterface
    {
        
        if ($this->container !== null) {
            return $this->container;
        }

        $systemManager = new ApmSystemManager($this->config);

        if ($systemManager->fatalErrorOccurred()) {
            throw new Exception($systemManager->getErrorMessage());
        }

        $this->systemManager = $systemManager;

        $container = new MinimalContainer();
        $container->addDefinitions([
            ApmContainerKey::SYSTEM_MANAGER => $systemManager,
            ApmContainerKey::USER_TID => 0,  // invalid user Ids, must be set downstream for some API and Site operations
            ApmContainerKey::API_USER_TID => 0,
        ]);

        $this->container = $container;
        return $container;
    }
    
    protected function createConfig($config) : array {
        // This function will create or overwrite
        // configuration options in the given $config
        // array, except for database connection information
        
        // SUPPORT
//        $config['support_contact_name'] = 'John Doe';
//        $config['support_contact_email'] = 'john@doe.com';



        $config[ApmConfigParameter::DB_TABLE_PREFIX] = 'ap_';
        $config[ApmConfigParameter::APM_DAEMON_PID_FILE] = '';
        $config[ApmConfigParameter::OPENSEARCH_HOSTS] = '';
        $config[ApmConfigParameter::OPENSEARCH_USER] = '';
        $config[ApmConfigParameter::OPENSEARCH_PASSWORD] = '';
        $config[ApmConfigParameter::BILDERBERG_URL] = '';


//            // DATABASE ACCESS
//            // should be in $config array already!
//            $config['db']['host'] = "";
//            $config['db']['user'] = "";
//            $config['db']['pwd'] = "";
//            $config['db']['db'] ="";

        // SUBDIR

        $config[ApmConfigParameter::SUB_DIR] = '';

        // TIME ZONE
        $config[ApmConfigParameter::DEFAULT_TIMEZONE] = "Europe/Berlin";

        // SLIM ERROR HANDLING
        // Might be set to false in production
        $config['displayErrorDetails'] = true;

        // LOG FILE  
        // The web server user should be able to create and write to the given file
        $config['log_filename'] = 'test.log';
        $config['log_include_debug_info'] = true;
        $config['log_in_php_error_handler'] = false;

        // LANGUAGES
        $config[ApmConfigParameter::LANGUAGES] = [
            [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
            [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
            [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3], 
            [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3] 
        ];

        // COLLATEX
        $config['collatex_temp_dir'] = '/tmp';
        $config['collatex_jar_file'] = '../../collatex/bin/collatex-tools-1.7.1.jar';


//        $config['plugin_dir'] = 'apm/test-plugins';

        $config[ApmConfigParameter::LOG_APP_NAME] = 'APM';

        // Generate langCodes
        $config[ApmConfigParameter::LANG_CODES] = [];
        foreach ($config[ApmConfigParameter::LANGUAGES] as $lang) {
            $config[ApmConfigParameter::LANG_CODES][] = $lang['code'];
        }
        
        $config[ApmConfigParameter::APP_NAME] = 'Averroes Project Manager (test)';
        $config[ApmConfigParameter::VERSION] = '(develop)';


        $config[ApmConfigParameter::COPYRIGHT_NOTICE] = '(C) Thomas Institut';

        $config[ApmConfigParameter::TWIG_USE_CACHE] = false;
        $config[ApmConfigParameter::TWIG_TEMPLATE_DIR] = '../../templates';


        return $config;
    }

    /**
     * @param int $userId
     * @throws Exception
     */
    public function setApiUser(int $userId): void
    {
        $this->getContainer()->set(ApmContainerKey::API_USER_TID, $userId);

    }

}
