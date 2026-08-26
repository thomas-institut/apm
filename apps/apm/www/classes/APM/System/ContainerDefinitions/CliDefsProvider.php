<?php

namespace APM\System\ContainerDefinitions;

use APM\System\ApmContainerKey;
use APM\System\Factories\LoggerFactory;
use Psr\Log\LoggerInterface;
use function DI\factory;

class CliDefsProvider implements ApmContainerDefsProvider
{

    /**
     * @inheritDoc
     */
    public function getContainerDefs(array $config): array
    {
        return array_merge(
            (new CommonDefsProvider())->getContainerDefs($config),
            [
                LoggerInterface::class => factory([LoggerFactory::class, 'createForCli']),
                'processUserInfoArray' => posix_getpwuid(posix_geteuid()),
                'cmd' => $this->argv[0] ?? '',
                'pid' => posix_getpid(),
            ]
        );
    }
}