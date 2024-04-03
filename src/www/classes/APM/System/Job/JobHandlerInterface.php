<?php

namespace APM\System\Job;

use APM\System\SystemManager;

interface JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload) : bool;
    public function mustBeUnique() : bool;
    public function minTimeBetweenSchedules() : int;
}