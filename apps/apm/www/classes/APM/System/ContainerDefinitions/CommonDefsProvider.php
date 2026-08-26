<?php

namespace APM\System\ContainerDefinitions;

use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\NodeService\NodeServiceClient;
use APM\System\ApmContainerKey;
use APM\System\ApmPdoProvider;
use APM\System\ApmSystemManager;
use APM\System\ApmTableNames;
use APM\System\Config\ApmSystemConfig;
use APM\System\Factories\ApmSystemConfigFactory;
use APM\System\Factories\LanguageManagerFactory;
use APM\System\Factories\MultiChunkEditionManagerFactory;
use APM\System\Factories\NodeServiceClientFactory;
use APM\System\Factories\PublicationManagerFactory;
use APM\System\Factories\TableNamesFactory;
use APM\System\Factories\TwigFactory;
use APM\System\Factories\ValkeyClientFactory;
use APM\System\LanguageManager;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\SystemManager;
use Predis\Client;
use Slim\Views\Twig;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use function DI\autowire;
use function DI\factory;

class CommonDefsProvider implements ApmContainerDefsProvider
{

    /**
     * @inheritDoc
     */
    public function getContainerDefs(array $config): array
    {
        return [
            ApmContainerKey::CONFIG_ARRAY => $config,
            ApmSystemConfig::class => factory([ApmSystemConfigFactory::class, 'create']),
            ApmTableNames::class => factory([TableNamesFactory::class, 'create']),
            PdoProvider::class => autowire(ApmPdoProvider::class),
            MultiChunkEditionManager::class => factory([MultiChunkEditionManagerFactory::class, 'create']),
            Twig::class => factory([TwigFactory::class, 'create']),
            SystemManager::class => autowire(ApmSystemManager::class),
            LanguageManager::class => factory([LanguageManagerFactory::class, 'create']),
            PublicationManagerInterface::class => factory([PublicationManagerFactory::class, 'create']),
            Client::class => factory([ValkeyClientFactory::class, 'create']),
            NodeServiceClient::class => factory([NodeServiceClientFactory::class, 'create']),
        ];
    }
}