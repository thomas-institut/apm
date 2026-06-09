<?php

namespace APM\System;

use APM\EntitySystem\ApmEntitySystem;
use APM\CollationTable\ApmCollationTableManager;
use APM\MultiChunkEdition\ApmMultiChunkEditionManager;
use APM\System\Document\ApmDocumentManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Preset\DataTablePresetManager;
use APM\System\Transcription\ApmTranscriptionManager;
use APM\System\User\ApmUserManager;
use APM\System\Work\WorkManager;
use PDO;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionException;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;

class ApmSystemManagerTest extends TestCase
{

    /**
     * Tests that resetting the DB connection also clears cached DB-dependent managers.
     * @return void
     * @throws ReflectionException
     */
    public function testResetDbConnectionAndDependentManagers(): void
    {
        $systemManager = $this->createSystemManagerWithoutConstructor();

        $this->setProperty($systemManager, 'dbConn', $this->createStub(PDO::class));
        $this->setProperty($systemManager, 'settingsMgr', $this->createStub(SettingsManager::class));
        $this->setProperty($systemManager, 'presetsManager', $this->createStub(DataTablePresetManager::class));
        $this->setProperty($systemManager, 'transcriptionManager', $this->createStub(ApmTranscriptionManager::class));
        $this->setProperty($systemManager, 'collationTableManager', $this->createStub(ApmCollationTableManager::class));
        $this->setProperty($systemManager, 'multiChunkEditionManager', $this->createStub(ApmMultiChunkEditionManager::class));
        $this->setProperty($systemManager, 'editionSourceManager', $this->createStub(EntitySystemEditionSourceManager::class));
        $this->setProperty($systemManager, 'userManager', $this->createStub(ApmUserManager::class));
        $this->setProperty($systemManager, 'personManager', $this->createStub(PersonManagerInterface::class));
        $this->setProperty($systemManager, 'workManager', $this->createStub(WorkManager::class));
        $this->setProperty($systemManager, 'typedMultiStorageEntitySystem', $this->createStub(TypedMultiStorageEntitySystem::class));
        $this->setProperty($systemManager, 'apmEntitySystem', $this->createStub(ApmEntitySystem::class));
        $this->setProperty($systemManager, 'documentManager', $this->createStub(ApmDocumentManager::class));

        $normalizerManager = new ApmNormalizerManager();
        $this->setProperty($systemManager, 'normalizerManager', $normalizerManager);

        $systemManager->resetDbConnectionAndDependentManagers();

        $this->assertNull($this->getProperty($systemManager, 'dbConn'));
        $this->assertNull($this->getProperty($systemManager, 'settingsMgr'));
        $this->assertNull($this->getProperty($systemManager, 'presetsManager'));
        $this->assertNull($this->getProperty($systemManager, 'transcriptionManager'));
        $this->assertNull($this->getProperty($systemManager, 'collationTableManager'));
        $this->assertNull($this->getProperty($systemManager, 'multiChunkEditionManager'));
        $this->assertNull($this->getProperty($systemManager, 'editionSourceManager'));
        $this->assertNull($this->getProperty($systemManager, 'userManager'));
        $this->assertNull($this->getProperty($systemManager, 'personManager'));
        $this->assertNull($this->getProperty($systemManager, 'workManager'));
        $this->assertNull($this->getProperty($systemManager, 'typedMultiStorageEntitySystem'));
        $this->assertNull($this->getProperty($systemManager, 'apmEntitySystem'));
        $this->assertNull($this->getProperty($systemManager, 'documentManager'));
        $this->assertSame($normalizerManager, $this->getProperty($systemManager, 'normalizerManager'));
    }

    /**
     * Creates an ApmSystemManager instance without running its constructor.
     * @return ApmSystemManager
     * @throws ReflectionException
     */
    private function createSystemManagerWithoutConstructor(): ApmSystemManager
    {
        return (new ReflectionClass(ApmSystemManager::class))->newInstanceWithoutConstructor();
    }

    /**
     * Sets a private property in ApmSystemManager for test setup.
     * @param ApmSystemManager $systemManager
     * @param string $propertyName
     * @param mixed $value
     * @return void
     * @throws ReflectionException
     */
    private function setProperty(ApmSystemManager $systemManager, string $propertyName, mixed $value): void
    {
        $reflection = new ReflectionClass(ApmSystemManager::class);
        $property = $reflection->getProperty($propertyName);
        $property->setValue($systemManager, $value);
    }

    /**
     * Reads a private property in ApmSystemManager.
     * @param ApmSystemManager $systemManager
     * @param string $propertyName
     * @return mixed
     * @throws ReflectionException
     */
    private function getProperty(ApmSystemManager $systemManager, string $propertyName): mixed
    {
        $reflection = new ReflectionClass(ApmSystemManager::class);
        $property = $reflection->getProperty($propertyName);
        return $property->getValue($systemManager);
    }
}
