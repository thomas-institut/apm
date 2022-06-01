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

namespace APM\CommandLine;

use APM\System\ApmSystemManager;
use AverroesProject\Data\UserManager;
use AverroesProject\Data\DataManager;
use Monolog\Logger;
use PDO;

/**
 * Description of CommandLineUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class CommandLineUtility {
    
    /**
     *
     * @var PDO
     */
    protected $dbConn;
    
    /**
     *
     * @var UserManager 
     */
    protected $um;
    
    /**
     *
     * @var Logger 
     */
    protected $logger;

    /**
     * @var array
     */
    protected $config;

    /**
     * @var ApmSystemManager
     */
    protected  $systemManager;
    /**
     * @var DataManager
     */
    protected $dm;

    /**
     * @var int
     */
    private $processUser;
    /**
     * @var int
     */
    protected $argc;
    /**
     * @var array
     */
    protected $argv;


    public function __construct(array $config, int $argc, array $argv) {

        $this->config = $config;
        $this->processUser = posix_getpwuid(posix_geteuid());
        $pid = posix_getpid();
        $this->argc = $argc;
        $this->argv = $argv;
        $cmd = $argv[0];

        // System Manager 
        $systemManager = new ApmSystemManager($config);

        $this->systemManager = $systemManager;

        if ($systemManager->fatalErrorOccurred()) {
            print "ERROR: " . $systemManager->getErrorMessage();
            exit();
        }

        $this->logger = $systemManager->getLogger()->withName('CMD');
        $processUser = $this->processUser;
        $this->logger->pushProcessor(
            function ($record) use($processUser, $pid, $cmd) { 
                $record['extra']['unixuser'] = $processUser['name'];
                $record['extra']['pid'] = $pid;
                $record['extra']['cmd'] = $cmd;
                return $record;
        });
        $dbConn = $systemManager->getDbConnection();
        $this->dbConn = $dbConn;
        $hm = $systemManager->getHookManager();

        // Data Manager (will be replaced completely by SystemManager at some point
        $this->dm = new DataManager($dbConn, $systemManager->getTableNames(), $this->logger, $hm, $config['langCodes']);
        
        $this->um = $this->dm->userManager;
    }
    
    public function run() {
        $result = $this->main($this->argc, $this->argv);
        $status = $result ? 0 : 1;
        exit($status);
    }
    
    protected function printErrorMsg($msg) 
    {
        $this->printStdErr("ERROR: $msg \n");
    }
    
    protected function printWarningMsg($msg) 
    {
        $this->printStdErr("WARNING: $msg \n");
    }

    protected function printStdErr($str) {
        fwrite(STDERR, $str);
    }


    protected abstract function main($argc, $argv);


}
