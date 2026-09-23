<?php

namespace APM\CommandLine\DataGrabber;


use APM\CommandLine\MultiToolCli\MultiToolCliUtilityManager;

class DataGrabber extends MultiToolCliUtilityManager
{
    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv, "Grab Data Tools");

        $this->defineUtilities([
            ViafIdGrabber::class,
            WikiDataGrabber::class
        ]);
    }

}