<?php

namespace ThomasInstitut\Ape\Cli;

require_once __DIR__ . '/../../../loadConfig.php';

use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\Ape\Factories\ApmApiClientFactory;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;
use CuyZ\Valinor\Mapper\MappingError;
use function DI\autowire;
use function DI\factory;

class ApeControlCli
{
    private Container $container;

    /**
     * @var array<string, CommandInterface
     */
    private array $commands = [];
    private string $scriptName;

    public function __construct()
    {
        $this->container = new Container();
        try {
            $this->container->set(SystemConfig::class, loadConfig());
        } catch (MappingError $e) {
            print("Error: Invalid config file: " . $e->getMessage() . "\n");
            exit(1);
        }
        $this->container->set(PublicationApiClient::class, factory([ ApmApiClientFactory::class, 'create']));
        $this->registerCommand('query-apm', QueryApmCliCommand::class);
        $this->registerCommand('info', InfoCliCommand::class);
    }

    private function registerCommand(string $name, string $className): void
    {
        $this->commands[$name] = $className;
        $this->container->set($className, autowire($className));
    }

    public function run(int $argc, array $argv) : int
    {
        $this->scriptName = $argv[0];
        if ($argc < 2) {
            $this->printUsage();
            return 1;
        }
        $commandName = $argv[1];
        if ($commandName === 'help') {
            $this->printUsage();
            return 0;
        }

        if (!isset($this->commands[$commandName])) {
            print("Unknown command: $commandName\n");
            return 1;
        }

        try {
            $command = $this->container->get($this->commands[$commandName]);
            if (!$command instanceof CommandInterface) {
                print("Error: Command $commandName is not a CommandInterface\n");
                return 1;
            }
            $result = $command->run($argc - 2, array_slice($argv, 2));
            if (!$result->success) {
                print("Error: $result->message\n");
                if ($result->printUsage){
                    $this->printUsage();
                }
                return 1;
            }
            return 0;

        } catch (DependencyException|NotFoundException) {
            print("Error: Command $commandName failed to run\n");
            return 0;
        }
    }

    private function printUsage(): void
    {
        print("Usage: $this->scriptName <command> [<args>]\n\n");
        print("Available commands:\n");
        foreach ($this->commands as $name => $command) {
            print("  $name: " . $command::getDescription() . "\n");
        }
    }
}