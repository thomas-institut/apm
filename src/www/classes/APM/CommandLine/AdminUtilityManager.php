<?php

namespace APM\CommandLine;




class AdminUtilityManager extends CommandLineUtility
{

    const DESC = 'APM Admin Utility';

    /**
     * @var array
     */
    private array $commands;
    private string $calledScriptName;
    private array $commandArgv;
    private int $commandArgc;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->calledScriptName = basename($argv[0]);

        $this->commands = [];

        $this->commandArgv = array_slice($argv, 1);
        $this->commandArgc = $argc -1;

        $utilityObjects = [
            new CacheTool($config, $this->commandArgc, $this->commandArgv),
            new JobQueueTool($config, $this->commandArgc, $this->commandArgv),
            new EntityTool($config, $this->commandArgc, $this->commandArgv)
        ];

        $this->commands = $this->getCommandObjectFromUtilityObjectArray($utilityObjects);

    }

    private function getCommandObjectFromUtilityObjectArray(array $utilityObjectArray) : array {
        $commandObject = [];
        foreach ($utilityObjectArray as $utilityObject) {
            /** @var AdminUtility $utilityObject */
            $commandObject[$utilityObject->getCommand()] = [
                'description' => $utilityObject->getDescription(),
                'help' => $utilityObject->getHelp(),
                'object' => $utilityObject
            ];
        }
        return $commandObject;
    }


    public function main($argc, $argv): int
    {
        if ($argc === 1) {
            $this->printGeneralHelp();
            return 1;
        }

        $command = $argv[1];

        if ($command === 'help') {
            if (!isset($argv[2])) {
                $this->printGeneralHelp();
                return 1;
            }
            $command = $argv[2];
            if (!$this->commandExists($command)) {
                printf("Unknown command '%s'\n", $command);
            } else {
                printf("%s\n", $this->commands[$command]['help']);
            }
            return 1;
        }
        if (!$this->commandExists($command)) {
            printf("Unknown command '%s'\n", $command);
        } else {
            $this->commands[$command]['object']->main($this->commandArgc, $this->commandArgv);
        }
        return 1;
    }

    private function commandExists($command) : bool{
        return isset($this->commands[$command]);
    }

    private function printGeneralHelp() : void {

        printf("APM admin utility\n");
        printf("   %s <command> [<command arguments>]  : Runs the given command\n", $this->calledScriptName);
        printf("   %s help <command>: Prints help message for the given command\n", $this->calledScriptName);
        print("\n");
        printf("Commands:\n");
        foreach ($this->commands as $command => $commandInfo) {
            printf("   %s: %s\n", $command, $commandInfo['description']);
        }
        print("\n");
    }
}