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
                if ($method === 'get') {
                    if ($args[0] === 'APM:PublicationManager:pub:1') {
                        $pub = new TranscriptionData();
                        $pub->id = 1;
                        $pub->type = PublicationType::Transcription;
                        $pub->title = 'Pub 1';
                        $pub->versionTimeString = '2023-01-01 00:00:00.000000';
                        return serialize($pub);
                    }
                    if ($args[0] === 'APM:PublicationManager:pub:2') {
                        $pub = new TranscriptionData();
                        $pub->id = 2;
                        $pub->type = PublicationType::Transcription;
                        $pub->title = 'Pub 2';
                        $pub->versionTimeString = '2023-01-01 00:00:00.000000';
                        return serialize($pub);
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
            ->with('get', ['APM:PublicationManager:pub:123'])
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
            ->with('get', ['APM:PublicationManager:pub:123'])
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

        $this->valkeyClient->expects($this->once())
            ->method('transaction')
            ->willReturnCallback(function($callback) use ($docId) {
                $tx = $this->createMock(Client::class);
                $tx->method('__call')->willReturnCallback(function($method, $args) use ($docId) {
                    if ($method === 'set') {
                        $this->assertEquals('APM:PublicationManager:pub:' . $docId, $args[0]);
                    } elseif ($method === 'sadd') {
                        $this->assertEquals('APM:PublicationManager:pubs', $args[0]);
                        $this->assertEquals([$docId], $args[1]);
                    }
                    return null;
                });
                $callback($tx);
            });

        $result = $this->manager->createPublication(PublicationType::Transcription, $docId);
        $this->assertEquals($docId, $result->id);
        $this->assertEquals(PublicationType::Transcription, $result->type);
    }
}
