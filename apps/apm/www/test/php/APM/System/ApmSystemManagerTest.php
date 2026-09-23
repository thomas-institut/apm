<?php

namespace APM\System;


use APM\System\Document\ApmDocumentManager;
use APM\System\Transcription\ApmTranscriptionManager;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use ReflectionClass;
use ReflectionException;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

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

        $pdoProvider = $this->createMock(ApmPdoProvider::class);
        $pdoProvider->expects($this->once())->method('reset');
        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [PdoProvider::class, $pdoProvider],
        ]);
        $this->setProperty($systemManager, 'ci', $container);
        $systemManager->resetDbConnectionAndDependentManagers();
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
