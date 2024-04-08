<?php

namespace APM\CommandLine;


use APM\CommandLine\DataGrabber\ViafIdGrabber;

class GrabData extends AdminUtilityManager
{
    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv, "Grab Data Tools");

        $utilities = [
            new ViafIdGrabber($config, $this->commandArgc, $this->commandArgv)
        ];
        $this->setCommands($utilities);
    }

}