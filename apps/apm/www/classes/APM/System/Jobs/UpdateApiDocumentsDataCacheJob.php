<?php

namespace APM\System\Jobs;

use APM\System\Actions\UpdateApiDocumentsDataCache\UpdateApiDocumentsDataCacheAction;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class UpdateApiDocumentsDataCacheJob implements JobHandlerInterface
{
    public function __construct(private ContainerInterface $container) {}

    /**
     * Runs the action that updates the API documents data cache.
     *
     * @param array $payload Document IDs whose cached data changed.
     * @param string $jobName The name of the job being run.
     * @return bool Whether the cache was updated successfully.
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function run(array $payload, string $jobName): bool
    {
        /** @var UpdateApiDocumentsDataCacheAction $action */
        $action = $this->container->get(UpdateApiDocumentsDataCacheAction::class);
        return $action->execute($payload);
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}