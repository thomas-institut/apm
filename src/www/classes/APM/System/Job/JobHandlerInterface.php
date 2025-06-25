<?php

namespace APM\System\Job;

use APM\System\SystemManager;

interface JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload, string $jobName) : bool;
    public function mustBeUnique() : bool;
    public function minTimeBetweenSchedules() : int;
}