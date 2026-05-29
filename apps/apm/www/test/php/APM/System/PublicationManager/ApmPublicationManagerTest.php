<?php

namespace APM\System\PublicationManager;

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\DocInfo;
use APM\System\Document\DocumentManager;
use APM\System\Document\PageInfo;
use APM\System\LanguageManager;
use APM\System\Transcription\TranscriptionManager;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;

class ApmPublicationManagerTest extends TestCase
{
    private MockObject&DocumentManager $dm;
    private MockObject&TranscriptionManager $tm;
    private MockObject&LanguageManager $lm;
    private MockObject&Client $valkeyClient;
    private ApmPublicationManager $manager;

    protected function setUp(): void
    {
        $this->dm = $this->createMock(DocumentManager::class);
        $this->tm = $this->createMock(TranscriptionManager::class);
        $this->lm = $this->createMock(LanguageManager::class);
        $this->valkeyClient = $this->createMock(Client::class);

        $this->manager = new ApmPublicationManager(
            $this->dm,
            $this->tm,
            $this->lm,
            ['source1'],
            $this->valkeyClient
        );
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testListReturnsEmptyArrayWhenNoData(): void
    {
        $this->valkeyClient->expects($this->once())
            ->method('__call')
            ->with('smembers', ['APM:PublicationManager:pubs'])
            ->willReturn([]);

        $this->assertEquals([], $this->manager->list());
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testListReturnsListings(): void
    {
        $this->valkeyClient->method('__call')
            ->willReturnCallback(function($method, $args) {
                if ($method === 'smembers') {
                    return [1, 2];
                }
                if ($method === 'hgetall') {
                    if ($args[0] === 'APM:PublicationManager:pub:1') {
                        return [
                            'type' => PublicationType::Transcription,
                            'title' => 'Pub 1',
                            'versionTimeString' => '2023-01-01 00:00:00.000000',
                            'description' => ''
                        ];
                    }
                    if ($args[0] === 'APM:PublicationManager:pub:2') {
                        return [
                            'type' => PublicationType::Transcription,
                            'title' => 'Pub 2',
                            'versionTimeString' => '2023-01-01 00:00:00.000000',
                            'description' => ''
                        ];
                    }
                }
                return null;
            });

        $result = $this->manager->list();
        $this->assertCount(2, $result);
        $this->assertInstanceOf(PublicationListing::class, $result[0]);
        $this->assertEquals(1, $result[0]->id);
        $this->assertEquals('Pub 1', $result[0]->title);
        $this->assertInstanceOf(PublicationListing::class, $result[1]);
        $this->assertEquals(2, $result[1]->id);
    }

    /**
     * @throws PublicationNotFoundException
     */
    #[AllowMockObjectsWithoutExpectations]
    public function testGetPublicationReturnsData(): void
    {
        $pub = new TranscriptionData();
        $pub->id = 123;
        $pub->title = 'Test Pub';

        $this->valkeyClient->expects($this->once())
            ->method('__call')
            ->with('hget', ['APM:PublicationManager:pub:123', 'data'])
            ->willReturn(serialize($pub));

        $result = $this->manager->getPublication(123);
        $this->assertEquals(123, $result->id);
        $this->assertEquals('Test Pub', $result->title);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testGetPublicationThrowsExceptionWhenNotFound(): void
    {
        $this->valkeyClient->expects($this->once())
            ->method('__call')
            ->with('hget', ['APM:PublicationManager:pub:123', 'data'])
            ->willReturn(null);

        $this->expectException(PublicationNotFoundException::class);
        $this->manager->getPublication(123);
    }

    /**
     * @throws PublicationNotFoundException
     */
    #[AllowMockObjectsWithoutExpectations]
    public function testDeletePublication(): void
    {
        $this->valkeyClient->method('__call')
            ->willReturnCallback(function($method) {
                if ($method === 'exists') {
                    return true;
                }
                return null;
            });

        $this->valkeyClient->expects($this->once())
            ->method('transaction')
            ->willReturnCallback(function($callback) {
                $tx = $this->createMock(Client::class);
                $tx->method('__call')->willReturnCallback(function($method, $args) {
                    static $calls = [];
                    $calls[] = [$method, $args];
                    return null;
                });
                $callback($tx);
            });

        $this->manager->deletePublication(123);
        $this->assertTrue(true); // If no exception, it passed the transaction
    }

    /**
     * @throws ResourceNotFoundException
     */
    #[AllowMockObjectsWithoutExpectations]
    public function testCreatePublication(): void
    {
        $docId = 456;
        $docInfo = new DocInfo();
        $docInfo->id = $docId;
        $docInfo->title = 'Test Document';
        $docInfo->language = 1;
        $docInfo->pageIds = [789];

        $this->dm->expects($this->once())
            ->method('getDocInfo')
            ->with($docId, true)
            ->willReturn($docInfo);

        $this->lm->expects($this->once())
            ->method('getLanguageCode')
            ->willReturn('en');

        $pageInfo = new PageInfo();
        $pageInfo->pageId = 789;
        $pageInfo->sequence = 1;
        $pageInfo->foliation = '1r';
        $pageInfo->type = Entity::PageTypeText;
        $pageInfo->numCols = 1;

        $this->dm->expects($this->once())
            ->method('getPageInfo')
            ->with(789)
            ->willReturn($pageInfo);

        $this->tm->expects($this->once())
            ->method('getColumnElementsByPageId')
            ->willReturn([]);

        $capturedPubKey = null;
        $capturedResourceId = null;
        $capturedType = null;

        $this->valkeyClient->expects($this->once())
            ->method('transaction')
            ->willReturnCallback(function($callback) use (&$capturedPubKey, &$capturedResourceId, &$capturedType) {
                $tx = $this->createMock(Client::class);
                $tx->method('__call')->willReturnCallback(function($method, $args) use (&$capturedPubKey, &$capturedResourceId, &$capturedType) {
                    if ($method === 'hset') {
                        $capturedPubKey = $args[0];
                        if ($args[1] === 'resourceId') {
                            $capturedResourceId = $args[2];
                        }
                        if ($args[1] === 'type') {
                            $capturedType = $args[2];
                        }
                    } elseif ($method === 'sadd') {
                        $this->assertEquals('APM:PublicationManager:pubs', $args[0]);
                    }
                    return null;
                });
                $callback($tx);
            });

        $result = $this->manager->createPublication(PublicationType::Transcription, $docId);
        $this->assertNotEquals($docId, $result->id);
        $this->assertEquals(PublicationType::Transcription, $result->type);
        $this->assertEquals('APM:PublicationManager:pub:' . $result->id, $capturedPubKey);
        $this->assertEquals((string)$docId, $capturedResourceId);
        $this->assertEquals(PublicationType::Transcription, $capturedType);
    }

    /**
     * @throws ResourceNotFoundException
     */
    #[AllowMockObjectsWithoutExpectations]
    public function testCreatePublicationDryRun(): void
    {
        $docId = 456;
        $docInfo = new DocInfo();
        $docInfo->id = $docId;
        $docInfo->title = 'Test Document';
        $docInfo->language = 1;
        $docInfo->pageIds = [];

        $this->dm->expects($this->once())
            ->method('getDocInfo')
            ->with($docId, true)
            ->willReturn($docInfo);

        $this->lm->expects($this->once())
            ->method('getLanguageCode')
            ->willReturn('en');

        $this->valkeyClient->expects($this->never())
            ->method('transaction');

        $result = $this->manager->createPublication(PublicationType::Transcription, $docId, 'current', true);
        $this->assertNotEquals($docId, $result->id);
        $this->assertEquals(PublicationType::Transcription, $result->type);
    }

    /**
     * @throws PublicationNotFoundException
     * @throws ResourceNotFoundException
     */
    #[AllowMockObjectsWithoutExpectations]
    public function testUpdatePublication(): void
    {
        $pubId = 123;
        $docId = 456;

        $this->valkeyClient->method('__call')
            ->willReturnCallback(function($method, $args) use ($pubId, $docId) {
                if ($method === 'hgetall') {
                    if ($args[0] === 'APM:PublicationManager:pub:' . $pubId) {
                        return [
                            'type' => PublicationType::Transcription,
                            'resourceId' => (string)$docId,
                            'title' => 'Old Title'
                        ];
                    }
                }
                return null;
            });

        $docInfo = new DocInfo();
        $docInfo->id = $docId;
        $docInfo->title = 'New Title';
        $docInfo->language = 1;
        $docInfo->pageIds = [];

        $this->dm->expects($this->once())
            ->method('getDocInfo')
            ->with($docId, true)
            ->willReturn($docInfo);

        $this->lm->expects($this->once())
            ->method('getLanguageCode')
            ->willReturn('en');

        $capturedFields = [];
        $this->valkeyClient->method('__call')
            ->willReturnCallback(function($method, $args) use (&$capturedFields) {
                if ($method === 'hgetall') {
                     return [
                            'type' => PublicationType::Transcription,
                            'resourceId' => '456',
                            'title' => 'Old Title'
                        ];
                }
                if ($method === 'hset') {
                    $capturedFields[$args[1]] = $args[2];
                }
                return null;
            });

        $this->manager->updatePublication($pubId);

        $this->assertEquals('New Title', $capturedFields['title']);
        $this->assertArrayHasKey('data', $capturedFields);
        /** @var TranscriptionData $updatedData */
        $updatedData = unserialize($capturedFields['data']);
        $this->assertEquals($pubId, $updatedData->id);
        $this->assertEquals('New Title', $updatedData->title);
    }
}
