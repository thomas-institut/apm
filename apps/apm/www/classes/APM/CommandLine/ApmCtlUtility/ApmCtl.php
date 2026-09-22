<?php

namespace APM\CommandLine\ApmCtlUtility;

class ApmCtl extends AdminUtilityManager
{

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv, "APM Control Utilities");

        $this->defineUtilities([
            CacheTool::class,
            DocTool::class,
            EntityTool::class,
            JobQueueTool::class,
            WorkTool::class,
            UserTool::class,
            TranscriptionTool::class,
            PublicationTool::class,
        ]);
    }
}