<?php

namespace APM\System\ContainerDefinitions;

use APM\CollationTable\CollationTableManager;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\NodeService\NodeServiceClient;
use APM\System\ApmContainerKey;
use APM\System\ApmLanguageManager;
use APM\System\ApmPdoProvider;
use APM\System\ApmSystemManager;
use APM\System\ApmTableNames;
use APM\System\Cache\DirectorySystemDirDataCache;
use APM\System\Cache\SystemDirDataCache;
use APM\System\Cache\SystemMemDataCache;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Cache\ValkeySystemMemDataCache;
use APM\System\Cache\ValkeySystemMainDataCache;
use APM\System\Config\ApmSystemConfig;
use APM\System\Factories\ApmSystemConfigFactory;
use APM\System\Factories\ApmEntitySystemFactory;
use APM\System\Factories\CollationTableManagerFactory;
use APM\System\Factories\JobQueueManagerFactory;
use APM\System\Factories\MultiChunkEditionManagerFactory;
use APM\System\Factories\NodeServiceClientFactory;
use APM\System\Factories\PresetManagerFactory;
use APM\System\Factories\PublicationManagerFactory;
use APM\System\Factories\TableNamesFactory;
use APM\System\Factories\TwigFactory;
use APM\System\Factories\UserManagerFactory;
use APM\System\Factories\ValkeyClientFactory;
use APM\System\LanguageManager;
use APM\System\Person\EntitySystemPersonManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Preset\PresetManager;
use APM\System\PublicationManager\PublicationManager;
use APM\System\SystemManager;
use APM\System\Transcription\EdNoteManager;
use APM\System\User\UserManagerInterface;
use APM\System\Work\EntitySystemWorkManager;
use APM\System\Work\WorkManager;
use Predis\Client;
use Slim\Views\Twig;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use ThomasInstitut\JobQueue\JobQueueManager;
use ThomasInstitut\ToolBox\MySqlHelper;
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
            LanguageManager::class => autowire(ApmLanguageManager::class),
            PublicationManager::class => factory([PublicationManagerFactory::class, 'create']),
            Client::class => factory([ValkeyClientFactory::class, 'create']),
            NodeServiceClient::class => factory([NodeServiceClientFactory::class, 'create']),
            EdNoteManager::class => autowire(EdNoteManager::class),
            MySqlHelper::class => autowire(MySqlHelper::class),
            ApmEntitySystemInterface::class => factory([ApmEntitySystemFactory::class, 'create']),
            SystemMainDataCache::class => autowire(ValkeySystemMainDataCache::class),
            SystemMemDataCache::class => autowire(ValkeySystemMemDataCache::class),
            SystemDirDataCache::class => autowire(DirectorySystemDirDataCache::class),
            JobQueueManager::class => factory([JobQueueManagerFactory::class, 'create']),
            PresetManager::class => factory([PresetManagerFactory::class, 'create']),
            CollationTableManager::class => factory([CollationTableManagerFactory::class, 'create']),
            UserManagerInterface::class => factory([UserManagerFactory::class, 'create']),
            PersonManagerInterface::class => autowire(EntitySystemPersonManager::class),
            WorkManager::class => autowire(EntitySystemWorkManager::class),
        ];
    }
}