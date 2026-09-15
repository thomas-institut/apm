<?php

namespace APM\Jobs;

use APM\Api\ApiPeople;
use APM\System\SystemManager;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class UpdateAllPeopleDataCacheJob implements JobHandlerInterface
{
    public function __construct(private ContainerInterface $container) {}

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function run(array $payload, string $jobName): bool
    {
        return ApiPeople::updateCachedAllPeopleDataForPeoplePage($this->container);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }
    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}