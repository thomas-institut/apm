<?php

namespace ThomasInstitut\JobQueue;

use Exception;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Log\NullLogger;
use stdClass;

class ValkeyJobQueueManagerTest extends TestCase
{
    private Client $valkey;
    private ValkeyJobQueueManager $jm;
    private string $prefix;

    protected function setUp(): void
    {
        // Try to get valkey host from config or environment
        $host = 'valkey';
        if (getenv('VALKEY_HOST')) {
            $host = getenv('VALKEY_HOST');
        }

        $this->prefix = 'TestQueue:' . rand(1000, 9999) . ':';
        $this->valkey = new Client(['host' => $host, 'port' => 6379]);
        
        try {
            $this->valkey->connect();
        } catch (Exception $e) {
            $this->markTestSkipped('Valkey not available: ' . $e->getMessage());
        }

        $this->jm = new ValkeyJobQueueManager($this->valkey, new NullLogger(), $this->prefix);
    }

    protected function tearDown(): void
    {
        if (isset($this->valkey)) {
            try {
                $keys = $this->valkey->keys($this->prefix . '*');
                if (!empty($keys)) {
                    $this->valkey->del($keys);
                }
            } catch (Exception) {
                // Ignore errors during teardown if valkey is not available
            }
        }
    }

    public function testR1RegisterJobHandler()
    {
        $valkey = $this->createStub(Client::class);
        $jm = new ValkeyJobQueueManager($valkey, new NullLogger(), $this->prefix);

        $handler = $this->createStub(JobHandlerInterface::class);
        $result = $jm->registerJobHandler('', $handler);
        $this->assertFalse($result);
        $this->assertNull($jm->getJobHandler('anything'));

        $jm->registerJobHandler('TestJob', $handler);
        $this->assertSame($handler, $jm->getJobHandler('TestJob'));
    }

    public function testR2ContainerIntegration()
    {
        $valkey = $this->createStub(Client::class);
        $handler = $this->createStub(JobHandlerInterface::class);
        $container = $this->createMock(ContainerInterface::class);

        $container->expects($this->atLeast(1))
            ->method('has')
            ->willReturnMap([
                ['LazyJob', true],
                ['InvalidJob', true],
                ['ExceptionJob', true],
            ]);

        $container->expects($this->atLeast(1))
            ->method('get')
            ->willReturnCallback(function($name) use ($handler) {
                if ($name === 'LazyJob') return $handler;
                if ($name === 'InvalidJob') return new stdClass();
                if ($name === 'ExceptionJob') {
                    throw new class('Container error') extends Exception implements ContainerExceptionInterface {};
                }
                return null;
            });

        $jm = new ValkeyJobQueueManager($valkey, new NullLogger(), $this->prefix, $container);

        $jm->registerJobHandler('LazyJob', null);
        $jm->registerJobHandler('InvalidJob', null);
        $jm->registerJobHandler('ExceptionJob', null);


        // First call should fetch from container
        $retrievedHandler = $jm->getJobHandler('LazyJob');
        $this->assertSame($handler, $retrievedHandler);

        // Second call should use cached version (container->get should not be called again)
        $retrievedHandler2 = $jm->getJobHandler('LazyJob');
        $this->assertSame($handler, $retrievedHandler2);

        // Test invalid job handler from container
        $this->assertNull($jm->getJobHandler('InvalidJob'));

        // Test exception from container
        $this->assertNull($jm->getJobHandler('ExceptionJob'));
    }

    public function testStrictModeAndLazyRegistration()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $container = $this->createStub(ContainerInterface::class);

        $container->method('has')->willReturnMap([
            ['LazyJob', true],
            ['UnknownJob', false],
        ]);
        $container->method('get')->willReturnMap([
            ['LazyJob', $handler],
        ]);

        $jm = new ValkeyJobQueueManager($this->valkey, new NullLogger(), $this->prefix, $container);

        // DEFAULT: Strict mode OFF
        // Should be able to schedule non-registered job if in container
        $sig = $jm->scheduleJob('LazyJob', 'desc', []);
        $this->assertNotEmpty($sig);
        $this->assertSame($handler, $jm->getJobHandler('LazyJob'));

        // Should NOT be able to schedule if not in container and not registered
        $sig2 = $jm->scheduleJob('UnknownJob', 'desc', []);
        $this->assertEmpty($sig2);

        // NEW MANAGER FOR STRICT MODE TEST
        $jmStrict = new ValkeyJobQueueManager($this->valkey, new NullLogger(), $this->prefix, $container);
        $jmStrict->setStrictMode(true);
        
        // Should NOT be able to schedule even if in container
        $sig3 = $jmStrict->scheduleJob('LazyJob', 'desc 2', []);
        $this->assertEmpty($sig3, "Should NOT schedule LazyJob in strict mode if not registered");
        
        // getJobHandler should return null for non-registered even if in container
        $this->assertNull($jmStrict->getJobHandler('LazyJob'), "getJobHandler should return null for non-registered in strict mode");

        // Manually registering should still work in strict mode
        $jmStrict->registerJobHandler('LazyJob', $handler);
        $sig4 = $jmStrict->scheduleJob('LazyJob', 'desc 3', []);
        $this->assertNotEmpty($sig4);
        $this->assertSame($handler, $jmStrict->getJobHandler('LazyJob'));
    }

    public function testT1BasicScheduling()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $payload = ['foo' => 'bar'];
        $sig = $this->jm->scheduleJob('NonRegisteredTestJob', 'Description', $payload);
        $this->assertEmpty($sig);

        $sig = $this->jm->scheduleJob('TestJob', 'Description', $payload);

        $this->assertNotEmpty($sig);

        // Check Waiting ZSET
        $score = $this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig);
        $this->assertNotNull($score);
        $this->assertLessThanOrEqual(microtime(true) + 1, $score);

        // Check Data HASH
        $data = $this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig);
        $this->assertNotEmpty($data);
        $jobData = json_decode($data, true);
        $this->assertEquals('TestJob', $jobData['name']);
        $this->assertEquals($payload, $jobData['payload']);
    }

    public function testT2Coalescing()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $payload = ['id' => 1];
        $sig1 = $this->jm->scheduleJob('TestJob', 'Coalesce', $payload, 10);
        $score1 = floatval($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig1));

        // Schedule same job again with different delay
        $sig2 = $this->jm->scheduleJob('TestJob', 'Coalesce', $payload, 5);
        $this->assertEquals($sig1, $sig2);

        $score2 = floatval($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig1));
        $this->assertLessThan($score1, $score2);

        // Verify only one entry exists in Waiting
        $this->assertEquals(1, $this->valkey->zcard($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING));
        // Verify only one entry exists in Data
        $this->assertEquals(1, $this->valkey->hlen($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA));
    }

    public function testT4SignatureStability()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $sig1 = $this->jm->scheduleJob('TestJob', 'Desc', ['id' => 1]);
        $sig2 = $this->jm->scheduleJob('TestJob', 'Desc', ['id' => 1]);
        $sig3 = $this->jm->scheduleJob('TestJob', 'Desc', ['id' => 2]);
        $sig4 = $this->jm->scheduleJob('TestJob', 'Other', ['id' => 1]);

        $this->assertEquals($sig1, $sig2);
        $this->assertNotEquals($sig1, $sig3);
        $this->assertNotEquals($sig1, $sig4);
    }

    public function testRescheduleJob()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $sig = $this->jm->scheduleJob('TestJob', 'Desc', ['id' => 1], 100);
        $score1 = floatval($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig));

        $reSig = $this->jm->rescheduleJob($sig, 10);
        $this->assertEquals($sig, $reSig);

        $score2 = floatval($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig));
        $this->assertLessThan($score1, $score2);

        // Test coverage for: if (!$data) { return ''; }
        $this->assertEquals('', $this->jm->rescheduleJob('non-existent-id', 10));

        // Test coverage for: if ($maxAttempts !== -1)
        $this->jm->rescheduleJob($sig, 10, 5);
        $data = json_decode($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig), true);
        $this->assertEquals(5, $data['max_attempts']);

        // Test coverage for: if ($secondBetweenRetries !== -1)
        $this->jm->rescheduleJob($sig, 10, -1, 30);
        $data = json_decode($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig), true);
        $this->assertEquals(30, $data['secs_between_retries']);
        
        // Verify attempts reset
        $data['attempts'] = 3;
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig, json_encode($data));
        $this->jm->rescheduleJob($sig, 10);
        $data = json_decode($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig), true);
        $this->assertEquals(0, $data['attempts']);
    }

    public function testGetJobCountsAndState()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $sig1 = $this->jm->scheduleJob('TestJob', 'J1', ['id' => 1]);
        $sig2 = $this->jm->scheduleJob('TestJob', 'J2', ['id' => 2]);

        $counts = $this->jm->getJobCountsByState();
        $this->assertEquals(2, $counts[ScheduledJobState::WAITING]);
        $this->assertEquals(0, $counts[ScheduledJobState::RUNNING]);

        $jobs = $this->jm->getJobsByState(ScheduledJobState::WAITING);
        $this->assertCount(2, $jobs);
        
        // Mock a running job
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig1, json_encode(['worker' => 'w1', 'started' => time()]));
        $counts = $this->jm->getJobCountsByState();
        $this->assertEquals(1, $counts[ScheduledJobState::RUNNING]);

        // Mock a dead job
        $data = $this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig2);
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD, $sig2, $data);
        $counts = $this->jm->getJobCountsByState();
        $this->assertEquals(1, $counts[ScheduledJobState::ERROR]);
    }

    public function testGetJobsByState()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $payload1 = ['id' => 1];
        $payload2 = ['id' => 2];
        $payload3 = ['id' => 3];

        $sig1 = $this->jm->scheduleJob('TestJob', 'J1', $payload1);
        $sig2 = $this->jm->scheduleJob('TestJob', 'J2', $payload2);
        $sig3 = $this->jm->scheduleJob('TestJob', 'J3', $payload3);

        // 1. Test WAITING
        $waitingJobs = $this->jm->getJobsByState(ScheduledJobState::WAITING);
        $this->assertCount(3, $waitingJobs);
        $this->assertEquals($sig1, $waitingJobs[0]['id']);
        $this->assertEquals(ScheduledJobState::WAITING, $waitingJobs[0]['state']);
        $this->assertEquals($payload1, $waitingJobs[0]['payload']);

        // 2. Test RUNNING
        // Move sig2 to processing manually (simulating a worker taking it)
        $this->valkey->zrem($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig2);
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig2, json_encode(['worker' => 'w1', 'started' => time()]));

        $runningJobs = $this->jm->getJobsByState(ScheduledJobState::RUNNING);
        $this->assertCount(1, $runningJobs);
        $this->assertEquals($sig2, $runningJobs[0]['id']);
        $this->assertEquals(ScheduledJobState::RUNNING, $runningJobs[0]['state']);
        $this->assertEquals($payload2, $runningJobs[0]['payload']);

        // 3. Test ERROR
        // Move sig3 to dead letter manually
        $this->valkey->zrem($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig3);
        $data3 = $this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig3);
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD, $sig3, $data3);

        $errorJobs = $this->jm->getJobsByState(ScheduledJobState::ERROR);
        $this->assertCount(1, $errorJobs);
        $this->assertEquals($sig3, $errorJobs[0]['id']);
        $this->assertEquals(ScheduledJobState::ERROR, $errorJobs[0]['state']);
        $this->assertEquals($payload3, $errorJobs[0]['payload']);

        // Re-verify WAITING (only sig1 should remain)
        $waitingJobs = $this->jm->getJobsByState(ScheduledJobState::WAITING);
        $this->assertCount(1, $waitingJobs);
        $this->assertEquals($sig1, $waitingJobs[0]['id']);
    }

    public function testCleanQueue()
    {
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD, 'sig1', json_encode(['name' => 'DeadJob']));
        $this->assertEquals(1, $this->valkey->hlen($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD));

        $this->jm->cleanQueue();
        $this->assertEquals(0, $this->valkey->hlen($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD));
    }

    public function testIsJobActive()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $name = 'TestJob';
        $desc = 'Description';
        $payload = ['foo' => 'bar'];

        // Not active yet
        $this->assertFalse($this->jm->isJobActive($name, $desc, $payload));

        // Schedule it
        $sig = $this->jm->scheduleJob($name, $desc, $payload);
        $this->assertTrue($this->jm->isJobActive($name, $desc, $payload));

        // Mock it as running
        $this->valkey->zrem($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig);
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig, json_encode(['worker' => 'w1', 'started' => time()]));
        $this->assertTrue($this->jm->isJobActive($name, $desc, $payload));

        // Complete it
        $this->valkey->hdel($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, [$sig]);
        $this->assertFalse($this->jm->isJobActive($name, $desc, $payload));
    }

    public function testFetchJob()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $payload = ['id' => 'fetch-me'];
        $sig = $this->jm->scheduleJob('TestJob', 'Desc', $payload);

        // 1. Fetch job that is ready
        $workerId = 'worker-1';
        $job = $this->jm->fetchJob($workerId);

        $this->assertNotNull($job, 'Job should not be null');
        $this->assertEquals($sig, $job['signature']);
        $this->assertEquals($payload, $job['data']['payload']);

        // Verify it was moved to processing
        $this->assertNull($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig));
        
        $processingKey = $this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING;
        $this->assertEquals(1, $this->valkey->hexists($processingKey, $sig), "Job $sig should exist in processing hash $processingKey");
        
        $procData = json_decode($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig), true);
        $this->assertEquals($workerId, $procData['worker_id']);

        // 2. Fetch when no job is ready (queue empty)
        $this->assertNull($this->jm->fetchJob($workerId));

        // 3. Fetch when job is scheduled for future
        $futurePayload = ['id' => 'future-job'];
        $this->jm->scheduleJob('TestJob', 'Future', $futurePayload, 100);
        $this->assertNull($this->jm->fetchJob($workerId));

        // 4. Fetch when job exists in waiting but data is missing
        $brokenSig = 'broken-sig';
        $this->valkey->zadd($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, [$brokenSig => microtime(true) - 10]);
        $this->assertNull($this->jm->fetchJob($workerId));
        // Verify it was removed from waiting
        $this->assertNull($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $brokenSig));
    }

    public function testJobStats()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $sig1 = $this->jm->scheduleJob('TestJob', 'J1', ['id' => 1]);
        $sig2 = $this->jm->scheduleJob('TestJob', 'J2', ['id' => 2]);

        // Finish sig1
        $this->jm->finishJob($sig1);

        $today = date('Y-m-d');
        $jobStats = $this->jm->getJobStats();
        $this->assertFalse($jobStats->isEmpty());
        $daily = $jobStats->getDailyStats();
        $this->assertCount(1, $daily);
        $this->assertEquals($today, $daily[0]->getDate());
        $this->assertEquals(1, $daily[0]->getCompleted());
        $this->assertEquals(0, $daily[0]->getFailed());

        // Fail sig2 (dead letter)
        $this->jm->failJob($sig2, "Error", false);
        $jobStats = $this->jm->getJobStats();
        $daily = $jobStats->getDailyStats();
        $this->assertCount(1, $daily);
        $this->assertEquals(1, $daily[0]->getCompleted());
        $this->assertEquals(1, $daily[0]->getFailed());

        // Reset stats
        $this->jm->resetJobStats();
        $this->assertTrue($this->jm->getJobStats()->isEmpty());
    }

    public function testFailJob()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $payload = ['id' => 'fail-me'];
        $sig = $this->jm->scheduleJob('TestJob', 'Desc', $payload, 0, 3, 10);

        // Fetch it so it's in processing
        $this->jm->fetchJob('worker-1');

        // 1. Fail with retry=true (attempts < max_attempts)
        $this->jm->failJob($sig, "First error", true);

        // Verify it was moved back to waiting (with delay)
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig));
        $score = $this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig);
        $this->assertNotNull($score);
        
        $data = json_decode($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig), true);
        $this->assertEquals(1, $data['attempts']);
        $this->assertEquals("First error", $data['last_error']);

        // 2. Fetch again and fail with retry=false
        $this->jm->fetchJob('worker-1');
        $this->jm->failJob($sig, "Second error", false);

        // Verify it moved to Dead Letter
        $this->assertNull($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig));
        $this->assertNull($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DATA, $sig));
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig));
        
        $deadData = json_decode($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD, $sig), true);
        $this->assertNotNull($deadData);
        $this->assertEquals(2, $deadData['attempts']);
        $this->assertEquals("Second error", $deadData['last_error']);

        // 3. Max attempts reached
        $sig2 = $this->jm->scheduleJob('TestJob', 'MaxAttempts', ['id' => 2]);
        $this->jm->fetchJob('worker-1');
        $this->jm->failJob($sig2, "Final error", true); // retry=true but max_attempts is 1

        $this->assertNotNull($this->valkey->hget($this->prefix . ValkeyJobQueueManager::SUFFIX_DEAD, $sig2));

        // 4. Missing data
        $brokenSig = 'broken-sig';
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $brokenSig, json_encode(['worker_id' => 'w1']));
        $this->jm->failJob($brokenSig, "No data error", true);
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $brokenSig));
    }

    public function testRunRecovery()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJobHandler('TestJob', $handler);

        $now = microtime(true);

        // 1. Job that should NOT be recovered (recent)
        $sig1 = $this->jm->scheduleJob('TestJob', 'Recent', ['id' => 1]);
        $this->jm->fetchJob('worker-1');
        // Manually update started_at to be very recent
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig1, json_encode([
            'worker_id' => 'worker-1',
            'started_at' => $now - 10 // 10 seconds ago
        ]));

        // 2. Job that SHOULD be recovered (timed out)
        $sig2 = $this->jm->scheduleJob('TestJob', 'TimedOut', ['id' => 2]);
        $this->jm->fetchJob('worker-2');
        // Manually update started_at to be long ago
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig2, json_encode([
            'worker_id' => 'worker-2',
            'started_at' => $now - 2000 // 2000 seconds ago (default timeout is 1800)
        ]));

        // Run recovery
        $recoveredCount = $this->jm->runRecovery();

        $this->assertEquals(1, $recoveredCount);

        // Verify sig1 is still in processing
        $this->assertEquals(1, $this->valkey->hexists($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig1));
        $this->assertNull($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig1));

        // Verify sig2 was moved to waiting
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig2));
        $this->assertNotNull($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig2));

        // 3. Custom timeout
        $sig3 = $this->jm->scheduleJob('TestJob', 'CustomTimeout', ['id' => 3]);
        $this->jm->fetchJob('worker-3');
        $this->valkey->hset($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig3, json_encode([
            'worker_id' => 'worker-3',
            'started_at' => $now - 100
        ]));

        $recoveredCount = $this->jm->runRecovery(50); // Recovery with 50s timeout
        $this->assertEquals(1, $recoveredCount);
        $this->assertEquals(0, $this->valkey->hexists($this->prefix . ValkeyJobQueueManager::SUFFIX_PROCESSING, $sig3));
        $this->assertNotNull($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig3));
    }
}
