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

use APM\System\ApmConfigParameter;
use APM\System\ApmSystemManager;
use AverroesProject\Data\UserManager;
use AverroesProject\Data\DataManager;
use JetBrains\PhpStorm\NoReturn;
use Monolog\Logger;
use PDO;
use Psr\Log\LoggerInterface;

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
    protected PDO $dbConn;
    
    /**
     *
     * @var UserManager 
     */
    protected UserManager $um;
    
    /**
     *
     * @var Logger 
     */
    protected LoggerInterface $logger;

    /**
     * @var array
     */
    protected array $config;

    /**
     * @var ApmSystemManager
     */
    protected ApmSystemManager $systemManager;
    /**
     * @var DataManager
     */
    protected DataManager $dm;

    /**
     * @var array
     */
    protected array $processUserInfoArray;
    /**
     * @var int
     */
    protected int $argc;
    /**
     * @var array
     */
    protected array $argv;
    protected int $pid;


    public function __construct(array $config, int $argc, array $argv) {

        $this->config = $config;
        $this->processUserInfoArray = posix_getpwuid(posix_geteuid());
        $this->pid = posix_getpid();
        $this->argc = $argc;
        $this->argv = $argv;

        $authorizedUsers = $config[ApmConfigParameter::COMMAND_LINE_USERS];
        $authorizedUsers[] = 'root';

        if (!in_array($this->processUserInfoArray['name'], $authorizedUsers)) {
            $this->printErrorMsg("Sorry, you don't have permission to run this command\n");
            exit(1);
        }

        $cmd = $argv[0] ?? 'cmd_not_in_argv';

        // System Manager 
        $systemManager = new ApmSystemManager($config);

        $this->systemManager = $systemManager;

        if ($systemManager->fatalErrorOccurred()) {
            $this->printErrorMsg($systemManager->getErrorMessage());
            exit(1);
        }

        $this->logger = $systemManager->getLogger()->withName('CMD');
        $processUser = $this->processUserInfoArray;
        $this->logger->pushProcessor(
            function ($record) use($processUser, $cmd) {
                $record['extra']['unixuser'] = $processUser['name'];
                $record['extra']['pid'] = $this->pid;
                $record['extra']['cmd'] = $cmd;
                return $record;
        });
        $dbConn = $systemManager->getDbConnection();
        $this->dbConn = $dbConn;
        $hm = $systemManager->getHookManager();

        // Data Manager (will be replaced completely by SystemManager at some point
        $this->dm = new DataManager($dbConn, $systemManager->getTableNames(), $this->logger, $hm, $config['langCodes']);
        $this->systemManager->setDataManager($this->dm);
        
        $this->um = $this->dm->userManager;
    }
    
    #[NoReturn] public function run(): void
    {
        $result = $this->main($this->argc, $this->argv);
        $status = $result ? 0 : 1;
        exit($status);
    }
    
    protected function printErrorMsg($msg): void
    {
        $this->printStdErr("ERROR: $msg \n");
    }
    
    protected function printWarningMsg($msg): void
    {
        $this->printStdErr("WARNING: $msg \n");
    }

    protected function printStdErr($str): void
    {
        fwrite(STDERR, $str);
    }


    public abstract function main($argc, $argv);


}
