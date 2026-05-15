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

use APM\System\ApmContainerKey;
use APM\System\ApmSystemManager;
use APM\System\Config\ApmSystemConfig;
use APM\System\Factories\LoggerFactory;
use APM\System\Factories\ApmSystemConfigFactory;
use APM\System\Factories\TwigFactory;
use APM\System\SystemManager;
use DI\ContainerBuilder;
use Exception;
use JetBrains\PhpStorm\NoReturn;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use Slim\Views\Twig;
use function DI\autowire;
use function DI\factory;

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
//        $this->systemManager = null;
        $this->logger = $this->container->get(LoggerInterface::class);
    }

    /**
     * @throws Exception
     */
    public function buildContainer() : void{
        $builder = new ContainerBuilder();
        $builder->addDefinitions([
            ApmContainerKey::CONFIG_ARRAY => $this->config,
            ApmSystemConfig::class => factory([ApmSystemConfigFactory::class, 'create']),
            LoggerInterface::class => factory([LoggerFactory::class, 'createForCli']),
            Twig::class => factory([TwigFactory::class, 'create']),
            SystemManager::class => autowire(ApmSystemManager::class),
            'processUserInfoArray' => posix_getpwuid(posix_geteuid()),
            'cmd' => $this->argv[0] ?? 'cmd_not_in_argv',
            'pid' => posix_getpid(),
        ]);
        $this->container = $builder->build();
    }

    public function getSystemManager() : ApmSystemManager {

        return $this->container->get(SystemManager::class);

//        if ($this->systemManager === null) {
//            $systemManager = new ApmSystemManager($this->config);
//            $this->systemManager = $systemManager;
//            if ($systemManager->fatalErrorOccurred()) {
//                $this->printErrorMsg($systemManager->getErrorMessage());
//                exit(1);
//            }
//            $this->logger = $systemManager->getLogger()->withName('CMD');
//            $processUser = $this->processUserInfoArray;
//            $cmd = $this->argv[0] ?? 'cmd_not_in_argv';
//            $this->logger->pushProcessor(
//                function ($record) use($processUser, $cmd) {
//                    $record['extra']['unixUser'] = $processUser['name'];
//                    $record['extra']['pid'] = $this->pid;
//                    $record['extra']['cmd'] = $cmd;
//                    return $record;
//                });
//        }
//        return $this->systemManager;
    }

    protected function getDbConn() : PDO {
        return $this->getSystemManager()->getDbConnection();
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

    protected function getAnswerFromCommandLine(string $question) : string {
        print $question;
        return fgets(STDIN);
    }

    protected function userRespondsYes(string $question) : bool {
        $question = trim($question);
        $question = "$question Type 'yes' to proceed: ";
        return strtolower(trim($this->getAnswerFromCommandLine($question))) === 'yes';
    }


    public abstract function main($argc, $argv);


}
