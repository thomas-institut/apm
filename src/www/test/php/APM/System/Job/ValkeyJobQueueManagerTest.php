<?php

namespace APM\Test\System\Job;

use APM\System\Job\JobHandlerInterface;
use APM\System\Job\ScheduledJobState;
use APM\System\Job\ValkeyJobQueueManager;
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
        } catch (\Exception $e) {
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
        $score = $this->valkey->zscore($this->prefix . 'Waiting', $sig);
        $this->assertNotNull($score);
        $this->assertLessThanOrEqual(microtime(true) + 1, $score);

        // Check Data HASH
        $data = $this->valkey->hget($this->prefix . 'Data', $sig);
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
        $score1 = floatval($this->valkey->zscore($this->prefix . 'Waiting', $sig1));

        // Schedule same job again with different delay
        $sig2 = $this->jm->scheduleJob('TestJob', 'Coalesce', $payload, 5);
        $this->assertEquals($sig1, $sig2);

        $score2 = floatval($this->valkey->zscore($this->prefix . 'Waiting', $sig1));
        $this->assertLessThan($score1, $score2);

        // Verify only one entry exists in Waiting
        $this->assertEquals(1, $this->valkey->zcard($this->prefix . 'Waiting'));
        // Verify only one entry exists in Data
        $this->assertEquals(1, $this->valkey->hlen($this->prefix . 'Data'));
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
        $score1 = floatval($this->valkey->zscore($this->prefix . 'Waiting', $sig));

        $resig = $this->jm->rescheduleJob($sig, 10);
        $this->assertEquals($sig, $resig);

        $score2 = floatval($this->valkey->zscore($this->prefix . 'Waiting', $sig));
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
        $this->valkey->hset($this->prefix . 'Processing', $sig1, json_encode(['worker' => 'w1', 'started' => time()]));
        $counts = $this->jm->getJobCountsByState();
        $this->assertEquals(1, $counts[ScheduledJobState::RUNNING]);

        // Mock a dead job
        $data = $this->valkey->hget($this->prefix . 'Data', $sig2);
        $this->valkey->hset($this->prefix . 'Dead', $sig2, $data);
        $counts = $this->jm->getJobCountsByState();
        $this->assertEquals(1, $counts[ScheduledJobState::ERROR]);
    }

    public function testCleanQueue()
    {
        $this->valkey->hset($this->prefix . 'Dead', 'sig1', json_encode(['name' => 'DeadJob']));
        $this->assertEquals(1, $this->valkey->hlen($this->prefix . 'Dead'));

        $this->jm->cleanQueue();
        $this->assertEquals(0, $this->valkey->hlen($this->prefix . 'Dead'));
    }
}
