<?php

namespace APM\System\ContainerDefinitions;

use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\NodeService\NodeServiceClient;
use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use APM\System\LanguageManager;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\SystemManager;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Slim\Views\Twig;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class CommonDefsProviderTest extends TestCase
{
    public function testProvidesCommonDefinitions(): void
    {
        $config = ['test' => true];
        $definitions = (new CommonDefsProvider())->getContainerDefs($config);

        $this->assertSame($config, $definitions[ApmContainerKey::CONFIG_ARRAY]);
        $this->assertSame(
            [
                ApmContainerKey::CONFIG_ARRAY,
                ApmSystemConfig::class,
//                ApmContainerKey::TABLE_NAMES,
                PdoProvider::class,
                MultiChunkEditionManager::class,
                Twig::class,
                SystemManager::class,
                LanguageManager::class,
                PublicationManagerInterface::class,
                Client::class,
                NodeServiceClient::class,
            ],
            array_keys($definitions)
        );
    }
}