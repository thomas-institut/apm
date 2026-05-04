<?php

namespace APM\Test\ApmWorker;

use APM\ApmWorker\ValkeyWorker;
use APM\System\ApmSystemManager;
use APM\System\Job\JobHandlerInterface;
use APM\System\Job\ValkeyJobQueueManager;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Psr\Log\NullLogger;

class ValkeyWorkerTest extends TestCase
{
    private Client $valkey;
    private ValkeyJobQueueManager $jm;
    private string $prefix;
    private ApmSystemManager $systemManager;

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
        $this->systemManager->method('getJobManager')->willReturn($this->jm);
        $this->systemManager->method('getLogger')->willReturn(new \Monolog\Logger('test', [new \Monolog\Handler\NullHandler()]));
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
        $this->jm->registerJob('TestJob', $handler);
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
        $this->jm->registerJob('TestJob', $handler);
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
        $this->jm->registerJob('TestJob', $handler);
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
            public function run(\APM\System\SystemManager $sm, array $payload, string $jobName): bool {
                $this->called = true;
                return true;
            }
            public function mustBeUnique(): bool { return false; }
            public function minTimeBetweenSchedules(): int { return 0; }
        };

        $this->jm->registerJob('UniqueJob', $handler);
        // Use -1 to ensure it's ready even if microtime precision is weird
        $this->jm->scheduleJob('UniqueJob', 'Desc', ['id' => 123], -1);

        $worker = new ValkeyWorker($this->systemManager, 1, 1, 0); 
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
}
