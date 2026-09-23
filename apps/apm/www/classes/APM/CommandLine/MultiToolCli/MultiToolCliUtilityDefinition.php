<?php

namespace APM\CommandLine\MultiToolCli;

final class MultiToolCliUtilityDefinition
{
    public function __construct(
        public string $name,
        public string $description,
        public string $usage,
        public string $class
    )
    {
    }

    /**
     * Generates a usage string for the given definitions
     *
     * @param array<string, MultiToolCliUtilityDefinition> $defs
     * @param string $field 'usage' | 'description'
     * @param int $indent
     * @param int $tabSize
     * @return string
     */
    static public function getInfo(array $defs, string $field, int $indent = 3, int $tabSize = 3): string
    {
        $names = array_keys($defs);
        sort($names);
        $longest = strlen($names[0]);
        foreach ($names as $name) {
            $longest = max($longest, strlen($name));
        }

        $indentString = str_repeat(' ', $indent);
        $tabString = str_repeat(' ', $tabSize);

        $lines = [];


        foreach ($defs as $command => $commandInfo) {
            $info = match ($field) {
                'usage' => $commandInfo->usage,
                'description' => $commandInfo->description,
            };
            $lines[] = sprintf("$indentString%-{$longest}s$tabString%s", $command, $info);
        }

        return implode("\n", $lines);

    }

}