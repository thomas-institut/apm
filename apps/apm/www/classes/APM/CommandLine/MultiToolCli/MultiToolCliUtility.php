<?php

namespace APM\CommandLine\MultiToolCli;

/**
 * Interface to a CLI utility that can be run from apmctl as:
 *
 * ```
 * apmctl tool <params>
 * ```
 *
 *
 */
interface MultiToolCliUtility
{
    public static function getName() : string;
    public static function getUsage() : string;
    public static function getDescription() : string;
    public function run(int $argc, array $argv): int;

}