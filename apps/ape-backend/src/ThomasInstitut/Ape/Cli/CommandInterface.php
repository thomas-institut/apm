<?php

namespace ThomasInstitut\Ape\Cli;

interface CommandInterface
{
    public function run(int $argc, array $argv) : CommandResult;


    public static function getDescription() : string;

    /**
     * Returns usage lines to report to the user.
     *
     * @return string[]
     */
    public static function getUsage() : array;
}