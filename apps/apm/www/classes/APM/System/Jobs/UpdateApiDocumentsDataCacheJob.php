<?php

namespace APM\System\Jobs;

use APM\Api\ApiDocuments;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class UpdateApiDocumentsDataCacheJob implements JobHandlerInterface
{
    public function __construct(private ContainerInterface $container) {}

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function run(array $payload, string $jobName): bool
    {
       return ApiDocuments::updateDataCache($this->container, $payload);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}