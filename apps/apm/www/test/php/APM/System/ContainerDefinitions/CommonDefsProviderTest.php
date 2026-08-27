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
use APM\System\LanguageManager;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\SystemManager;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Slim\Views\Twig;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use ThomasInstitut\ToolBox\MySqlHelper;

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
            LanguageManager::class,
            PublicationManagerInterface::class,
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
}