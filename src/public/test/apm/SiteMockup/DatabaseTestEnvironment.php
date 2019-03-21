<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM;
require "../vendor/autoload.php";

use AverroesProject\Data\DataManager;
use APM\System\ApmSystemManager;

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
    
    public function __construct($apmTestConfig) {
        $this->config = $this->createOptionsArray($apmTestConfig);
        $this->dbConn = false;
        $this->container = false;
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
    
    
    
    public function getDataManager($logger, $hm)
    {   
        $config = $this->config;

        return new DataManager($this->getPdo(), 
                $config['tables'], 
                $logger,
                $hm, $config['langCodes']);
    }
    
    
    public function emptyDatabase()
    {
        $dbConn = $this->getPdo();
        
        // Can't TRUNCATE because of foreign keys
        $query = <<<EOD
                DELETE FROM ap_ednotes;
                DELETE FROM ap_items;
                DELETE FROM ap_elements;
                DELETE FROM ap_pages;
                DELETE FROM ap_docs;
                DELETE FROM ap_relations;
                DELETE FROM ap_users;
                DELETE FROM ap_people;
                DELETE FROM ap_hands;
                INSERT INTO `ap_hands` (`id`, `name`, `description`) VALUES
(0, 'Unknown', 'Unknown hand');
EOD;
        $dbConn->query($query);
        
    }
    
    public function getContainer()
    {
        
        if ($this->container !== false) {
            return $this->container;
        }
        $config = $this->config;
        
        $sm = new ApmSystemManager($config);
        
        $dbh = $sm->getDbConnection();
        $hm = $sm->getHookManager();
        $logger = $sm->getLogger();
        $cr = $sm->getCollationEngine();
        $dataManager = new DataManager($dbh, $config['tables'], $logger, $hm, $config['langCodes']);
        
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
        $config['support-contact-name'] = 'John Doe';
        $config['support-contact-email'] = 'john@doe.com';

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
        $config['logfilename'] = 'test.log';
        $config['logDebugInfo'] = true;
        $config['logInPhpErrorErrorHandler'] = false;

        // LANGUAGES
        $config['languages'] = [
            [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
            [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
            [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3], 
            [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3] 
        ];

        // COLLATEX
        $config['collatex']['tmp'] = '../collatex/tmp';
        $config['collatex']['javaExecutable'] = '/usr/bin/java';
        $config['collatex']['collatexJarFile'] = '../collatex/bin/collatex-tools-1.7.1.jar';


        // PLUGINS
        // a plugin named 'PluginName' must be implemented as
        // a class with the fully qualified name '\PluginName' and its
        // code must reside in  ./plugins/PluginName.php


        $config['addContentLengthHeader'] = false;

        $config['pluginDirectory'] = 'plugins';

        $config['loggerAppName'] = 'APM';

        $prefix = 'ap_';

        $config['tables'] = [];
        $config['tables']['settings']   = $prefix . 'settings';
        $config['tables']['ednotes']    = $prefix . 'ednotes';
        $config['tables']['elements']   = $prefix . 'elements';
        $config['tables']['items']      = $prefix . 'items';
        $config['tables']['users']      = $prefix . 'users';
        $config['tables']['tokens']     = $prefix . 'tokens';
        $config['tables']['relations']  = $prefix . 'relations';
        $config['tables']['docs']       = $prefix . 'docs';
        $config['tables']['people']     = $prefix . 'people';
        $config['tables']['pages']      = $prefix . 'pages';
        $config['tables']['types_page'] = $prefix . 'types_page';
        $config['tables']['works']      = $prefix . 'works';
        $config['tables']['presets']    = $prefix . 'presets';

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
