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

}