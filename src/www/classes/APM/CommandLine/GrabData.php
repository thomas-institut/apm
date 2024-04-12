<?php

namespace APM\CommandLine;


use APM\CommandLine\DataGrabber\ViafIdGrabber;
use APM\CommandLine\DataGrabber\WikiDataGrabber;

class GrabData extends AdminUtilityManager
{
    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv, "Grab Data Tools");

        $utilities = [
            new ViafIdGrabber($config, $this->commandArgc, $this->commandArgv),
            new WikiDataGrabber($config, $this->commandArgc, $this->commandArgv)
        ];
        $this->setCommands($utilities);
    }

}