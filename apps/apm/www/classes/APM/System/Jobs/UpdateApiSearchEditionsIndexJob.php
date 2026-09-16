<?php

namespace APM\System\Jobs;

use APM\CommandLine\IndexManager;
use APM\System\ApmContainerKey;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use Throwable;

readonly class UpdateApiSearchEditionsIndexJob implements JobHandlerInterface
{
    public function __construct(private ContainerInterface $container) {}

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function run(array $payload, string $jobName): bool
    {
        /** @var array $config */
        $config = $this->container->get(ApmContainerKey::CONFIG_ARRAY);

        /** @var LoggerInterface $logger */
        $logger = $this->container->get(LoggerInterface::class);

        // Fetch data from payload
        $table_id = $payload[0];

        $im = new IndexManager($config, 0, []);
        $im->setIndexNamePrefix('editions');

        try {
            $im->updateOrAddItem($table_id);
            return true;
        } catch (Throwable $e) {
            $logger->error("Error updating editions index for table $table_id: " . $e->getMessage());
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