<?php

namespace APM\Jobs;

use APM\Api\ApiSearch;
use APM\System\SystemManager;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Throwable;

class ApiSearchUpdateEditorsAndEditionsCache implements JobHandlerInterface

{
    public function __construct(private SystemManager $sm) {}

    public function run(array $payload, string $jobName): bool
    {
        try {
            return ApiSearch::updateDataCache($this->sm, 'editions',  $this->sm->getLogger());
        } catch (Throwable $e) {
            $this->sm->getLogger()->error("Error updating editors and editions cache: " . $e->getMessage());
            return false;
        }
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}