<?php

namespace APM\Test\ApmDaemon;

use APM\ApmDaemon\ApmDaemon;
use APM\System\ApmSystemManager;
use APM\System\Job\ValkeyJobQueueManager;
use Monolog\Handler\NullHandler;
use Monolog\Logger;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class ApmDaemonTest extends TestCase
{
    public function testRunJobQueueRecoveryCallsManager(): void
    {
        $jobManager = $this->createMock(ValkeyJobQueueManager::class);
        $jobManager->expects($this->once())
            ->method('runRecovery')
            ->with(ApmDaemon::JOB_TIMEOUT)
            ->willReturn(5);

        $systemManager = $this->createStub(ApmSystemManager::class);
        $systemManager->method('getJobManager')->willReturn($jobManager);
        $systemManager->method('getLogger')->willReturn(new Logger('test', [new NullHandler()]));

        $config = ['authorizedCommandLineUsers' => [posix_getpwuid(posix_geteuid())['name']]];
        
        $daemon = $this->getMockBuilder(ApmDaemon::class)
            ->setConstructorArgs([$config, 0, []])
            ->onlyMethods(['getSystemManager'])
            ->getMock();

        $daemon->expects($this->atLeastOnce())->method('getSystemManager')->willReturn($systemManager);

        // Use reflection to call the private method
        $reflection = new ReflectionClass(ApmDaemon::class);
        $method = $reflection->getMethod('runJobQueueRecovery');
        $method->setAccessible(true);

        $method->invoke($daemon);
    }

    public function testRunJobQueueRecoveryRespectsInterval(): void
    {
        $jobManager = $this->createMock(ValkeyJobQueueManager::class);
        $jobManager->expects($this->once()) // Only once even if we call it twice
            ->method('runRecovery')
            ->willReturn(0);

        $systemManager = $this->createStub(ApmSystemManager::class);
        $systemManager->method('getJobManager')->willReturn($jobManager);
        $systemManager->method('getLogger')->willReturn(new Logger('test', [new NullHandler()]));

        $config = ['authorizedCommandLineUsers' => [posix_getpwuid(posix_geteuid())['name']]];

        $daemon = $this->getMockBuilder(ApmDaemon::class)
            ->setConstructorArgs([$config, 0, []])
            ->onlyMethods(['getSystemManager'])
            ->getMock();

        $daemon->expects($this->atLeastOnce())->method('getSystemManager')->willReturn($systemManager);

        $reflection = new ReflectionClass(ApmDaemon::class);
        $method = $reflection->getMethod('runJobQueueRecovery');
        $method->setAccessible(true);

        $method->invoke($daemon);
        $method->invoke($daemon); // Second call should be skipped due to interval
    }
}
