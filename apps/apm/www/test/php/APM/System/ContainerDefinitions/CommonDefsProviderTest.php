<?php

namespace APM\System\ContainerDefinitions;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\NodeService\NodeServiceClient;
use APM\System\ApmContainerKey;
use APM\System\ApmTableNames;
use APM\System\Cache\SystemDirDataCache;
use APM\System\Cache\SystemMemDataCache;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Config\ApmSystemConfig;
use APM\System\Events\EventManager;
use APM\System\Events\EventRegistry;
use APM\System\Events\CollationTableSaved;
use APM\System\Events\DocumentAdded;
use APM\System\Events\DocumentDeleted;
use APM\System\Events\DocumentUpdated;
use APM\System\Events\EntityDataChanged;
use APM\System\Events\PageSettingsUpdated;
use APM\System\Events\PersonDataChanged;
use APM\System\Events\TranscriptionUpdated;
use APM\System\Events\TranscriptionUpdatedPayload;
use APM\System\Events\WorkAdded;
use APM\System\Events\WorkDeleted;
use APM\System\Events\WorkUpdated;
use APM\System\LanguageManager;
use APM\System\PublicationManager\PublicationManager;
use APM\System\SystemManager;
use DI\ContainerBuilder;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Slim\Views\Twig;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use ThomasInstitut\JobQueue\JobQueueManager;
use ThomasInstitut\ToolBox\MySqlHelper;
use function DI\value;

class CommonDefsProviderTest extends TestCase
{
    public function testProvidesCommonDefinitions(): void
    {
        $config = ['test' => true];
        $definitions = (new CommonDefsProvider())->getContainerDefs($config);

        $this->assertSame($config, $definitions[ApmContainerKey::CONFIG_ARRAY]);

        $expectedKeys = [
            ApmContainerKey::CONFIG_ARRAY,
            ApmSystemConfig::class,
            ApmTableNames::class,
            PdoProvider::class,
            MultiChunkEditionManager::class,
            Twig::class,
            SystemManager::class,
            EventRegistry::class,
            EventManager::class,
            LanguageManager::class,
            PublicationManager::class,
            Client::class,
            NodeServiceClient::class,
            MySqlHelper::class,
            ApmEntitySystemInterface::class,
            SystemMemDataCache::class,
            SystemMainDataCache::class,
            SystemDirDataCache::class,
        ];
        $defKeys = array_keys($definitions);

        foreach ($expectedKeys as $key) {
            $this->assertContains($key, $defKeys);
        }
    }

    /**
     * Test that the shared event services can be resolved from container definitions.
     */
    public function testRegistersSharedEventServices(): void
    {
        $builder = new ContainerBuilder();
        $builder->addDefinitions((new CommonDefsProvider())->getContainerDefs([]));
        $container = $builder->build();

        $registry = $container->get(EventRegistry::class);
        $this->assertInstanceOf(EventRegistry::class, $registry);
        $this->assertInstanceOf(EventManager::class, $container->get(EventManager::class));

        $eventClasses = [
            TranscriptionUpdated::class,
            PageSettingsUpdated::class,
            CollationTableSaved::class,
            DocumentAdded::class,
            DocumentUpdated::class,
            DocumentDeleted::class,
            EntityDataChanged::class,
            PersonDataChanged::class,
            WorkAdded::class,
            WorkUpdated::class,
            WorkDeleted::class,
        ];
        foreach ($eventClasses as $eventClass) {
            $this->assertNotNull($registry->getRegistration($eventClass));
        }
    }

    /**
     * Test that PHP-DI resolves centrally registered listeners by their class names.
     */
    public function testPhpDiResolvesRegisteredEventListeners(): void
    {
        $jobQueueManager = $this->createMock(JobQueueManager::class);
        $jobQueueManager->expects($this->exactly(5))->method('scheduleJob')->willReturn('');
        $definitions = (new CommonDefsProvider())->getContainerDefs([]);
        $definitions[JobQueueManager::class] = value($jobQueueManager);
        $builder = new ContainerBuilder();
        $builder->addDefinitions($definitions);
        $container = $builder->build();

        $container->get(EventManager::class)->emit(
            TranscriptionUpdated::class,
            new TranscriptionUpdatedPayload(17, 23, 5, 2)
        );

        $this->addToAssertionCount(1);
    }
}