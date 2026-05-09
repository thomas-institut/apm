<?php

namespace APM\ApmDaemon;

use Throwable;

class DaemonTask
{

    /**
     * @var callable
     */
    private $taskCallable;
    private string $name;

    private int $runCount = 0;

    public function __construct(string $name, callable $taskCallable)
    {
        $this->taskCallable = $taskCallable;
        $this->name = $name;
    }

    /**
     * @throws Throwable
     */
    public function run() : void {
        call_user_func($this->taskCallable);
        $this->runCount++;
    }

    public function getName() : string {
        return $this->name;
    }

    public function getRunCount() : int {
        return $this->runCount;
    }

}