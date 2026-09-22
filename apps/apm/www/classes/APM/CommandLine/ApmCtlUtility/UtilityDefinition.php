<?php

namespace APM\CommandLine\ApmCtlUtility;

final class UtilityDefinition
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