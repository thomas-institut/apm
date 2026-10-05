<?php

namespace APM\System\Factories;

use Monolog\Logger;
use Predis\Client;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\JobQueue\JobQueueManagerInterface;
use ThomasInstitut\JobQueue\ValkeyJobQueueManager;

class JobQueueManagerFactory
{

    public static function create(ContainerInterface $ci, LoggerInterface $logger, Client $valkeyClient): JobQueueManagerInterface
    {

        if ($logger instanceof Logger) {
            $logger = $logger->withName("JOB_QUEUE");
        }
        return new ValkeyJobQueueManager(
            $valkeyClient,
            $logger,
            ValkeyJobQueueManager::DEFAULT_PREFIX,
            $ci
        );

    }

}