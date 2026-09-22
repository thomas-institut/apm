<?php

namespace APM\CommandLine\MultiToolCli;




use APM\CommandLine\ApmCliUtility;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;

class MultiToolCliUtilityManager extends ApmCliUtility
{

    /**
     * @var array<string, MultiToolCliUtilityDefinition>
     */
    private array $utilities;

    private string $calledScriptName;
    protected array $commandArgv;
    protected int $commandArgc;
    private string $description;

    public function __construct(array $config, int $argc, array $argv, string $description)
    {
        parent::__construct($config, $argc, $argv);

        $this->calledScriptName = basename($argv[0]);
        $this->commandArgv = array_slice($argv, 1);
        $this->commandArgc = $argc -1;
        $this->description = $description;

    }

    protected  function defineUtilities(array $utilityClasses) : void {
        foreach($utilityClasses as $utilityClass) {
            $this->utilities[$utilityClass::getName()] = new MultiToolCliUtilityDefinition(
                $utilityClass::getName(),
                $utilityClass::getDescription(),
                $utilityClass::getUsage(),
                $utilityClass
            );
        }
    }



    public function main(int $argc, array $argv) : int
    {
        if ($argc === 1) {
            $this->printGeneralHelp();
            return 1;
        }

        $utility = $argv[1];

        if ($utility === 'help' || $utility === 'usage') {
            if (!isset($argv[2])) {
                $this->printGeneralHelp();
                return 1;
            }
            $utility = $argv[2];
            if (!$this->utilityExists($utility)) {
                printf("Unknown command '%s'\n", $utility);
            } else {
                printf("%s\n", $this->utilities[$utility]->usage);
            }
            return 1;
        }
        if (!$this->utilityExists($utility)) {
            printf("Unknown command '%s'\n", $utility);
        } else {
            try {
                /** @var MultiToolCliUtility $utilityObject */
                $utilityObject = $this->container->get($this->utilities[$utility]->class);
                $utilityObject->run($this->commandArgc, $this->commandArgv);
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
                printf("Error: %s\n", $e->getMessage());
                return 0;
            }
        }
        return 1;
    }

    private function utilityExists($command) : bool{
        return isset($this->utilities[$command]);
    }

    private function printGeneralHelp() : void {

        printf("$this->description\n");
        printf("   %s <command> [<command arguments>]  : Runs the given command\n", $this->calledScriptName);
        printf("   %s help <command>: Prints help message for the given command\n", $this->calledScriptName);
        print("\n");
        printf("Commands:\n");
        foreach ($this->utilities as $command => $commandInfo) {
            printf("   %s: %s\n", $command, $commandInfo->description);
        }
        print("\n");
    }
}