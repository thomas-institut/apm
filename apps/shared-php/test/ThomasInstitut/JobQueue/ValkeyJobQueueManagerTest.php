<?php

namespace ThomasInstitut\JobQueue;

use Exception;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Psr\Log\NullLogger;

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
            $keys = $this->valkey->keys($this->prefix . '*');
            if (!empty($keys)) {
                $this->valkey->del($keys);
            }
        }
    }

    public function testT1BasicScheduling()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJob('TestJob', $handler);

        $payload = ['foo' => 'bar'];
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
        $this->jm->registerJob('TestJob', $handler);

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
        $this->jm->registerJob('TestJob', $handler);

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
        $this->jm->registerJob('TestJob', $handler);

        $sig = $this->jm->scheduleJob('TestJob', 'Desc', ['id' => 1], 100);
        $score1 = floatval($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig));

        $reSig = $this->jm->rescheduleJob($sig, 10);
        $this->assertEquals($sig, $reSig);

        $score2 = floatval($this->valkey->zscore($this->prefix . ValkeyJobQueueManager::SUFFIX_WAITING, $sig));
        $this->assertLessThan($score1, $score2);
    }

    public function testGetJobCountsAndState()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJob('TestJob', $handler);

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
        $this->jm->registerJob('TestJob', $handler);

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

    public function testJobStats()
    {
        $handler = $this->createStub(JobHandlerInterface::class);
        $this->jm->registerJob('TestJob', $handler);

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
}
