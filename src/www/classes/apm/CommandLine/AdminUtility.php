<?php

namespace APM\CommandLine;

interface AdminUtility
{
    public function getCommand() : string;
    public function getHelp() : string;
    public function getDescription() : string;

    public function main(int $argc, array $argv): int;

}