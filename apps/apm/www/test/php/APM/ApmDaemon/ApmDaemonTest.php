<?php

namespace APM\ApmDaemon;

use APM\CommandLine\CommandLineUtility;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use ReflectionClass;
use ReflectionProperty;
use ThomasInstitut\JobQueue\JobQueueManager;
use ThomasInstitut\JobQueue\ValkeyJobQueueManager;

class ApmDaemonTest extends TestCase
{
    private array $configMock = [
        'version' =>  [ 'version' => '1.0.0', 'versionDate' => '2023-01-01', 'jsAppCacheDataId' => '1234567890'],
        'nodeService' => [ 'url' => 'https://localhost/'],
        'log' => ['inStdErr' => false]];

    /**
     * Test that recovery is run using the job queue manager from the container.
     */
    public function testRunJobQueueRecoveryCallsManager(): void
    {
        $jobManager = $this->createMock(ValkeyJobQueueManager::class);
        $jobManager->expects($this->once())
            ->method('runRecovery')
            ->with(ApmDaemon::JOB_TIMEOUT)
            ->willReturn(5);

        $daemon = $this->createDaemonWithJobManager($jobManager);

        $reflection = new ReflectionClass(ApmDaemon::class);
        $method = $reflection->getMethod('runJobQueueRecovery');
        $method->invoke($daemon);
    }

    /**
     * Test that recovery is not run again before the recovery interval elapses.
     */
    public function testRunJobQueueRecoveryRespectsInterval(): void
    {
        $jobManager = $this->createMock(ValkeyJobQueueManager::class);
        $jobManager->expects($this->once()) // Only once even if we call it twice
            ->method('runRecovery')
            ->willReturn(0);

        $daemon = $this->createDaemonWithJobManager($jobManager);

        $reflection = new ReflectionClass(ApmDaemon::class);
        $method = $reflection->getMethod('runJobQueueRecovery');

        $method->invoke($daemon);
        $method->invoke($daemon); // Second call should be skipped due to interval
    }

    /**
     * Create a daemon whose container returns the supplied job queue manager.
     */
    private function createDaemonWithJobManager(ValkeyJobQueueManager $jobManager): ApmDaemon
    {
        $config = $this->configMock;
        $config['authorizedCommandLineUsers'] = [posix_getpwuid(posix_geteuid())['name']];

        $daemon = new ApmDaemon($config, 0, []);
        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [JobQueueManager::class, $jobManager],
        ]);

        $containerProperty = new ReflectionProperty(CommandLineUtility::class, 'container');
        $containerProperty->setValue($daemon, $container);

        return $daemon;
    }
}
