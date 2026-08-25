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

use APM\System\ContainerDefinitions\CliDefsProvider;
use APM\System\SystemManager;
use DI\ContainerBuilder;
use Exception;
use JetBrains\PhpStorm\NoReturn;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;

/**
 * Description of CommandLineUtility
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class CommandLineUtility {
    protected ?LoggerInterface $logger;

    protected array $config;


//    private ?ApmSystemManager $systemManager;
    protected array $processUserInfoArray;

    protected int $argc;
    protected array $argv;
    protected int $pid;

    protected ContainerInterface $container;


    /**
     * @param array $config
     * @param int $argc
     * @param array $argv
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws Exception
     */
    public function __construct(array $config, int $argc, array $argv) {
        $this->config = $config;
        try {
            $this->buildContainer();

            $this->processUserInfoArray = $this->container->get('processUserInfoArray');
            $this->pid = $this->container->get('pid');
            $this->argc = $argc;
            $this->argv = $argv;

            $authorizedUsers = $config['authorizedCommandLineUsers'] ?? [];
            $authorizedUsers[] = 'root';

            if (!in_array($this->processUserInfoArray['name'], $authorizedUsers)) {
                $this->printErrorMsg("Sorry, you don't have permission to run this command\n");
                exit(1);
            }
            $this->logger = $this->container->get(LoggerInterface::class);
        } catch (Exception $e) {
            $this->printErrorMsg("Configuration error: " . $e->getMessage() . "\n");
            exit(1);
        }
    }

    /**
     * @throws Exception
     */
    public function buildContainer() : void{
        $builder = new ContainerBuilder();
        $builder->addDefinitions((new CliDefsProvider())->getContainerDefs($this->config));
        $this->container = $builder->build();
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getSystemManager() : ApmSystemManager {

        return $this->container->get(SystemManager::class);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    protected function getDbConn() : PDO {
        return $this->getSystemManager()->getPdoProvider()->getPdo();
    }
    
    #[NoReturn] public function run(): void // @phpstan-ignore attribute.notFound
    {
        $result = $this->main($this->argc, $this->argv);
        if (is_int($result)) {
            exit($result);
        }
        exit($result ? 0 : 1);
    }
    
    protected function printErrorMsg($msg): void
    {
        $this->printStdErr("ERROR: $msg \n");
    }

    protected function printStdErr($str): void
    {
        fwrite(STDERR, $str);
    }

    protected function getAnswerFromCommandLine(string $question) : string {
        print $question;
        return fgets(STDIN);
    }

    protected function userRespondsYes(string $question) : bool {
        $question = trim($question);
        $question = "$question Type 'yes' to proceed: ";
        return strtolower(trim($this->getAnswerFromCommandLine($question))) === 'yes';
    }


    public abstract function main(int $argc, array $argv): bool | int;


}
