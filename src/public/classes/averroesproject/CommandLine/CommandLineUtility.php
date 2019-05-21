<?php
/* 
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject\CommandLine;

use APM\System\ApmSystemManager;
use AverroesProject\Data\UserManager;
use AverroesProject\Data\DataManager;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

/**
 * Description of CommandLineUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class CommandLineUtility {
    
    /**
     *
     * @var \PDO
     */
    protected $dbh;
    
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
    
    protected $config;
    
    
    public function __construct($config) {
        global $argv;
        
        $this->config = $config;
        $this->processUser = posix_getpwuid(posix_geteuid());
        $pid = posix_getpid();
        $cmd = $argv[0];

        // System Manager 
        $systemManager = new ApmSystemManager($config);

        if ($systemManager->fatalErrorOccurred()) {
            print "ERROR: " . $systemManager->getErrorMsg();
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
        $dbh = $systemManager->getDbConnection();
        $hm = $systemManager->getHookManager();

        // Data Manager (will be replaced completely by SystemManager at some point
        $this->dm = new DataManager($dbh, $systemManager->getTableNames(), $this->logger, $hm, $config['langCodes']);
        
        $this->um = $this->dm->um;
    }
    
    public function run($argc, $argv) {
        $result = $this->main($argc, $argv);
        $status = $result ? 0 : 1;
        exit($status);
    }
    
    protected function printErrorMsg($msg) 
    {
        print "ERROR: $msg \n";
    }
    
    protected function printWarningMsg($msg) 
    {
        print "WARNING: $msg \n";
    }


    protected abstract function main($argc, $argv);
    
    private function exitWithError($msg) 
    {
        $this->logger->error($msg);
        $this->printErrorMsg($msg);
        exit(0);
    }
}
