<?php

namespace ThomasInstitut\Ape\Managers;

use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\TestCase;
use Predis\Client;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;

class PredisClientMock extends Client
{
    public function get(string $key): mixed { return null; }
    public function set(string $key, mixed $value): mixed { return null; }
    public function del(array|string $keyOrKeys): int { return 0; }
}

#[AllowMockObjectsWithoutExpectations]
class ValkeyPublicationManagerTest extends TestCase
{
    private $valkey;
    private $apiClient;
    private $logger;
    private $manager;

    protected function setUp(): void
    {
        $this->valkey = $this->createMock(PredisClientMock::class);
        $this->apiClient = $this->createMock(PublicationApiClient::class);
        $this->logger = $this->createStub(LoggerInterface::class);
        $this->manager = new ValkeyPublicationManager($this->valkey, $this->apiClient, $this->logger);
    }

    public function testGetPublicationListingsReturnsEmptyArrayWhenNoData()
    {
        $this->valkey->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(null);

        $this->assertEquals([], $this->manager->getPublicationListings());
    }

    public function testGetPublicationListingsReturnsUnserializedData()
    {
        $listings = [new PublicationListing()];
        $listings[0]->id = 1;

        $this->valkey->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize($listings));

        $result = $this->manager->getPublicationListings();
        $this->assertCount(1, $result);
        $this->assertInstanceOf(PublicationListing::class, $result[0]);
        $this->assertEquals(1, $result[0]->id);
    }

    public function testGetPublicationDataThrowsExceptionWhenNotFound()
    {
        $this->valkey->expects($this->once())
            ->method('get')
            ->with('publication:data:1')
            ->willReturn(null);

        $this->expectException(PublicationNotFoundException::class);
        $this->manager->getPublicationData(1);
    }

    public function testGetLastUpdateTimestampReturnsZeroWhenNoData()
    {
        $this->valkey->expects($this->once())
            ->method('get')
            ->with('publications:lastUpdate')
            ->willReturn(null);

        $this->assertEquals(0, $this->manager->getLastUpdateTimestamp());
    }

    public function testGetLastUpdateTimestampReturnsValueFromValkey()
    {
        $timestamp = 1621773840;
        $this->valkey->expects($this->once())
            ->method('get')
            ->with('publications:lastUpdate')
            ->willReturn((string)$timestamp);

        $this->assertEquals($timestamp, $this->manager->getLastUpdateTimestamp());
    }

    /**
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmHandlesNewPublication()
    {
        $listing = new PublicationListing();
        $listing->id = 1;
        $listing->versionTimeString = '2023-01-01';
        $listing->title = 'Title';
        $listing->description = 'Desc';

        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$listing];

        $this->apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        // Initially empty local listings
        $this->valkey->method('get')
            ->willReturnMap([
                ['publications:listings', null]
            ]);

        $data = new TextPublicationData();
        $data->id = 1;
        $data->text = 'Content';

        $getResponse = new PublicationApiGetResponse();
        $getResponse->publicationData = $data;

        $this->apiClient->expects($this->once())
            ->method('get')
            ->with(1)
            ->willReturn($getResponse);

        $this->valkey->expects($this->exactly(3))
            ->method('set')
            ->willReturnCallback(function ($key, $value) use ($data, $listing) {
                static $count = 0;
                if ($count === 0) {
                    $this->assertEquals('publication:data:1', $key);
                    $this->assertEquals(serialize($data), $value);
                } elseif ($count === 1) {
                    $this->assertEquals('publications:listings', $key);
                    $this->assertEquals(serialize([$listing]), $value);
                } else {
                    $this->assertEquals('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $this->manager->updateFromApm();
    }

    /**
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmHandlesRemoval()
    {
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = []; // APM is empty

        $this->apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        $oldListing = new PublicationListing();
        $oldListing->id = 1;

        $this->valkey->method('get')
            ->with('publications:listings')
            ->willReturn(serialize([$oldListing]));

        $this->valkey->expects($this->once())
            ->method('del')
            ->with(['publication:data:1']);

        $this->valkey->expects($this->exactly(2))
            ->method('set')
            ->willReturnCallback(function ($key, $value) {
                static $count = 0;
                if ($count === 0) {
                    $this->assertEquals('publications:listings', $key);
                    $this->assertEquals(serialize([]), $value);
                } else {
                    $this->assertEquals('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $this->manager->updateFromApm();
    }
}
