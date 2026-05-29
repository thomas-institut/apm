<?php

namespace APM\Test\ApmWorker;

use APM\ApmWorker\ValkeyWorker;
use APM\System\ApmSystemManager;
use APM\System\SystemManager;
use Monolog\Handler\NullHandler;
use Monolog\Logger;
use PDOException;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\JobQueue\JobHandlerInterface;
use ThomasInstitut\JobQueue\ValkeyJobQueueManager;

class ValkeyWorkerTest extends TestCase
{
    private Client $valkey;
    private ValkeyJobQueueManager $jm;
    private string $prefix;
    private ApmSystemManager $systemManager;
    private ContainerInterface $ci;

    protected function setUp(): void
    {
        $host = getenv('VALKEY_HOST') ?: 'valkey';
        $this->prefix = 'TestWorker:' . rand(1000, 9999) . ':';
        $this->valkey = new Client(['host' => $host, 'port' => 6379]);

        try {
            $this->valkey->connect();
        } catch (\Exception $e) {
            $this->markTestSkipped('Valkey not available: ' . $e->getMessage());
        }

        $this->jm = new ValkeyJobQueueManager($this->valkey, new NullLogger(), $this->prefix);

        $this->systemManager = $this->createStub(ApmSystemManager::class);
        $this->systemManager->method('getJobQueueManager')->willReturn($this->jm);
        $this->systemManager->method('getLogger')->willReturn(new Logger('test', [new NullHandler()]));

        $this->ci = $this->createStub(ContainerInterface::class);
        $this->ci->method('get')->willReturnMap([
            [SystemManager::class, $this->systemManager],
            [LoggerInterface::class, new Logger('test', [new NullHandler()])],
        ]);
    }

    protected function tearDown(): void
    {
        if (isset($this->valkey)) {
            $keys = $this->valkey->keys($this->prefix . '*');
            if (!empty($keys)) {
                $this->valkey->del($keys);
            }
        }
    }

    public function testFetchJob(): void
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);
        $this->jm->scheduleJob('TestJob', 'Desc', ['foo' => 'bar']);

        $workerId = 'test-worker';
        $job = $this->jm->fetchJob($workerId);

        $this->assertNotNull($job);
        $this->assertEquals('TestJob', $job['data']['name']);

        // Verify it moved to Processing
        $this->assertEquals(1, $this->valkey->hexists($this->prefix . 'Processing', $job['signature']));
        // Verify it is NOT in Waiting anymore
        $this->assertNull($this->valkey->zscore($this->prefix . 'Waiting', $job['signature']));
    }

    public function testFinishJob(): void
    {
        $sig = 'test-sig';
        $this->valkey->hset($this->prefix . 'Data', $sig, json_encode(['name' => 'TestJob']));
        $this->valkey->hset($this->prefix . 'Processing', $sig, json_encode(['worker' => 'w1']));

        $this->jm->finishJob($sig);

        $this->assertEquals(0, $this->valkey->hexists($this->prefix . 'Data', $sig));
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . 'Processing', $sig));
    }

    public function testFailJobWithRetry(): void
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);
        $sig = $this->jm->scheduleJob('TestJob', 'Desc', [], 0, 3);

        // Mock it being in processing (fetchJob usually does this)
        $this->valkey->hset($this->prefix . 'Processing', $sig, json_encode(['worker' => 'w1', 'started_at' => microtime(true)]));
        $this->valkey->zrem($this->prefix . 'Waiting', $sig);

        $this->jm->failJob($sig, "Some error", true);

        // Should be back in Waiting
        $this->assertNotNull($this->valkey->zscore($this->prefix . 'Waiting', $sig));
        // Should NOT be in Processing
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . 'Processing', $sig));

        // Attempts should be 1
        $dataStr = $this->valkey->hget($this->prefix . 'Data', $sig);
        $this->assertNotFalse($dataStr);
        $data = json_decode($dataStr, true);
        $this->assertEquals(1, $data['attempts']);
        $this->assertEquals("Some error", $data['last_error']);
    }

    public function testFailJobToDeadLetter(): void
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);
        $sig = $this->jm->scheduleJob('TestJob', 'Desc', [], 0, 1);

        $this->jm->failJob($sig, "Fatal error", true);

        // Should NOT be in Waiting
        $this->assertNull($this->valkey->zscore($this->prefix . 'Waiting', $sig));
        // Should be in Dead
        $this->assertEquals(1, $this->valkey->hexists($this->prefix . 'Dead', $sig));
        // Should NOT be in Data
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . 'Data', $sig));
    }

    public function testWorkerProcessJob(): void
    {
        $handler = new class implements JobHandlerInterface {
            public bool $called = false;
            public function run(array $payload, string $jobName): bool {
                $this->called = true;
                return true;
            }
            public function mustBeUnique(): bool { return false; }
            public function minTimeBetweenSchedules(): int { return 0; }
        };

        $this->jm->registerJobHandler('UniqueJob', $handler);
        // Use -1 to ensure it's ready even if microtime precision is weird
        $this->jm->scheduleJob('UniqueJob', 'Desc', ['id' => 123], -1);

        $worker = new ValkeyWorker($this->ci, 1, 1, 0); 
        $worker->run();

        $this->assertTrue($handler->called);
        
        // Queue should be empty now
        $this->assertEquals(0, $this->valkey->zcard($this->prefix . 'Waiting'));
        $this->assertEquals(0, $this->valkey->hlen($this->prefix . 'Data'));
    }

    public function testRunRecovery(): void
    {
        $sig = 'orphaned-sig';
        $this->valkey->hset($this->prefix . 'Data', $sig, json_encode(['name' => 'OrphanedJob']));
        // Mock a job started 1 hour ago
        $this->valkey->hset($this->prefix . 'Processing', $sig, json_encode(['worker' => 'dead-worker', 'started_at' => microtime(true) - 3600]));

        $recovered = $this->jm->runRecovery(1800);
        $this->assertEquals(1, $recovered);

        // Should be back in Waiting
        $this->assertNotNull($this->valkey->zscore($this->prefix . 'Waiting', $sig));
        // Should NOT be in Processing
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . 'Processing', $sig));
    }

    public function testProcessJobRetriesOnceOnMySql2006AndFinishes(): void
    {
        $handler = $this->createMock(JobHandlerInterface::class);
        $handler->expects($this->exactly(2))
            ->method('run')
            ->willReturnCallback(function () {
                static $calls = 0;
                $calls++;
                if ($calls === 1) {
                    throw new PDOException('SQLSTATE[HY000]: General error: 2006 MySQL server has gone away', '2006');
                }

                return true;
            });

        $jobManager = $this->createMock(ValkeyJobQueueManager::class);
        $jobManager->expects($this->once())->method('getJobHandler')->with('RetryJob')->willReturn($handler);
        $jobManager->expects($this->once())->method('finishJob')->with('sig-1');
        $jobManager->expects($this->never())->method('failJob');

        $systemManager = $this->createMock(ApmSystemManager::class);
        $systemManager->method('getLogger')->willReturn(new Logger('test', [new NullHandler()]));
        $systemManager->expects($this->once())->method('resetDbConnectionAndDependentManagers');

        $ci = $this->createStub(ContainerInterface::class);
        $ci->method('get')->willReturnMap([
            [SystemManager::class, $systemManager],
            [LoggerInterface::class, $systemManager->getLogger()],
        ]);

        $worker = new ValkeyWorker($ci, 1);
        $job = ['signature' => 'sig-1', 'data' => ['name' => 'RetryJob', 'payload' => []]];

        $method = new \ReflectionMethod(ValkeyWorker::class, 'processJob');
        $method->invoke($worker, $jobManager, $job);
    }

    public function testProcessJobFailsAfterSecondMySql2006Exception(): void
    {
        $handler = $this->createMock(JobHandlerInterface::class);
        $handler->expects($this->exactly(2))
            ->method('run')
            ->willThrowException(new PDOException('SQLSTATE[HY000]: General error: 2006 MySQL server has gone away', '2006'));

        $jobManager = $this->createMock(ValkeyJobQueueManager::class);
        $jobManager->expects($this->once())->method('getJobHandler')->with('FailJob')->willReturn($handler);
        $jobManager->expects($this->never())->method('finishJob');
        $jobManager->expects($this->once())
            ->method('failJob')
            ->with('sig-2', $this->stringContains('2006'), true);

        $systemManager = $this->createMock(ApmSystemManager::class);
        $systemManager->method('getLogger')->willReturn(new Logger('test', [new NullHandler()]));
        $systemManager->expects($this->once())->method('resetDbConnectionAndDependentManagers');

        $ci = $this->createStub(ContainerInterface::class);
        $ci->method('get')->willReturnMap([
            [SystemManager::class, $systemManager],
            [LoggerInterface::class, $systemManager->getLogger()],
        ]);

        $worker = new ValkeyWorker($ci, 1);
        $job = ['signature' => 'sig-2', 'data' => ['name' => 'FailJob', 'payload' => []]];

        $method = new \ReflectionMethod(ValkeyWorker::class, 'processJob');
        $method->invoke($worker, $jobManager, $job);
    }

    public function testCheckDbConnectionResetIntervalCallsSystemManagerAtInterval(): void
    {
        $systemManager = $this->createMock(ApmSystemManager::class);
        $systemManager->method('getLogger')->willReturn(new Logger('test', [new NullHandler()]));
        $systemManager->expects($this->once())->method('resetDbConnectionAndDependentManagers');
        $ci = $this->createStub(ContainerInterface::class);
        $ci->method('get')->willReturnMap([
            [SystemManager::class, $systemManager],
            [LoggerInterface::class, $systemManager->getLogger()],
        ]);
        $mins = ValkeyWorker::MinDbResetConnectionIntervalInMinutes;

        $worker = new ValkeyWorker($ci, 1, 1, 0, $mins);

        $lastResetTimeProperty = new \ReflectionProperty(ValkeyWorker::class, 'lastDbConnectionResetTime');
        $lastResetTimeProperty->setValue($worker, time() - ($mins * 60 +1));

        $method = new \ReflectionMethod(ValkeyWorker::class, 'checkDbConnectionResetInterval');
        $method->invoke($worker);
    }
}
