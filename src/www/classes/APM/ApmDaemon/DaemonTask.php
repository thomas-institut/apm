<?php

namespace APM\ApmDaemon;

use Fiber;
use Throwable;

class DaemonTask
{

    /**
     * @var callable
     */
    private $fiberGenerator;
    private ?Fiber $currentFiber = null;
    private string $name;

    private int $runCount = 0;

    public function __construct(string $name, callable $fiberGenerator)
    {
        $this->fiberGenerator = $fiberGenerator;
        $this->name = $name;
    }

    /**
     * @throws Throwable
     */
    public function run() : void {
        if ($this->currentFiber === null || $this->currentFiber->isTerminated()) {
            $this->currentFiber = call_user_func($this->fiberGenerator);
            $this->currentFiber->start();
            $this->runCount++;
            return;
        }
        if ($this->currentFiber->isSuspended()) {
            $this->currentFiber->resume();
        }
    }

    public function getName() : string {
        return $this->name;
    }

    public function getRunCount() : int {
        return $this->runCount;
    }

}