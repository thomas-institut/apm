<?php

namespace APM\CommandLine;

use APM\CommandLine\ApmCtlUtility\CacheTool;
use APM\CommandLine\ApmCtlUtility\EntityTool;
use APM\CommandLine\ApmCtlUtility\JobQueueTool;
use APM\CommandLine\ApmCtlUtility\TranscriptionTool;
use APM\CommandLine\ApmCtlUtility\UserTool;

class ApmCtl extends AdminUtilityManager
{

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv, "APM Control Utilities");
        $utilities = [
            new CacheTool($config, $this->commandArgc, $this->commandArgv),
            new JobQueueTool($config, $this->commandArgc, $this->commandArgv),
            new EntityTool($config, $this->commandArgc, $this->commandArgv),
            new UserTool($config, $this->commandArgc, $this->commandArgv),
            new TranscriptionTool($config, $this->commandArgc, $this->commandArgv),
        ];
        $this->setCommands($utilities);
    }

}