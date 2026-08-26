<?php

namespace APM\System\ContainerDefinitions;

use APM\System\ApmContainerKey;
use APM\System\Factories\LoggerFactory;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ToolBox\MySqlHelper;
use function DI\autowire;
use function DI\factory;

class WebAppDefsProvider implements ApmContainerDefsProvider
{

    /**
     * @inheritDoc
     */
    public function getContainerDefs(array $config): array
    {
        return array_merge(
            (new CommonDefsProvider())->getContainerDefs($config),
            [
                ApmContainerKey::SITE_USER_ID => -1, // set by authenticator
                ApmContainerKey::API_USER_ID => -1, // set by authenticator
                LoggerInterface::class => factory([LoggerFactory::class, 'create']),
            ]
        );
    }
}