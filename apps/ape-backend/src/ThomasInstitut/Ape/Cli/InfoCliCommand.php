<?php

namespace ThomasInstitut\Ape\Cli;

use ThomasInstitut\Ape\Config\SystemConfig;

readonly class InfoCliCommand implements CommandInterface
{

    public function __construct(private SystemConfig $systemConfig)
    {
    }

    public function run(int $argc, array $argv): CommandResult
    {
        printf("This is %s version %s\n", $this->systemConfig->general->name, $this->systemConfig->version->title);
        return new CommandResult(true);
    }

    public static function getDescription(): string
    {
        return "Shows information about the server";
    }

    public static function getUsage(): array
    {
       return [ ];
    }
}