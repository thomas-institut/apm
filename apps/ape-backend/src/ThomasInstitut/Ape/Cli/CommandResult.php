<?php

namespace ThomasInstitut\Ape\Cli;

class CommandResult
{
    public function __construct(public bool $success, public string $message = '', public bool $printUsage = false)
    {

    }
}