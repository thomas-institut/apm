<?php

namespace ThomasInstitut\Ape\Managers;

use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Predis\ClientInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;

interface PredisClientMethodsInterface extends ClientInterface
{
    public function get(string $key): mixed;

    public function set(string $key, mixed $value): mixed;

    public function del(array|string $keyOrKeys): int;
}

#[AllowMockObjectsWithoutExpectations]
class ValkeyPublicationManagerTest extends TestCase
{
    private PredisClientMethodsInterface&MockObject $valkeyClient;
    private  PublicationApiClient&MockObject $apiClient;
    private ValkeyPublicationManager $manager;

    protected function setUp(): void
    {
        $this->valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $this->apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createStub(LoggerInterface::class);
        $this->manager = new ValkeyPublicationManager($this->valkeyClient, $this->apiClient, $logger);
    }

    public function testGetPublicationListingsReturnsEmptyArrayWhenNoData()
    {
        $this->valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(null);

        $this->assertEquals([], $this->manager->getPublicationListings());
    }

    public function testGetPublicationListingsReturnsUnserializedData()
    {
        $listings = [new PublicationListing()];
        $listings[0]->id = 1;

        $this->valkeyClient->expects($this->once())
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
        $this->valkeyClient->expects($this->once())
            ->method('get')
            ->with('publication:data:1')
            ->willReturn(null);

        $this->expectException(PublicationNotFoundException::class);
        $this->manager->getPublicationData(1);
    }

    public function testGetLastUpdateTimestampReturnsZeroWhenNoData()
    {
        $this->valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:lastUpdate')
            ->willReturn(null);

        $this->assertEquals(0, $this->manager->getLastUpdateTimestamp());
    }

    public function testGetLastUpdateTimestampReturnsValueFromValkey()
    {
        $timestamp = 1621773840;
        $this->valkeyClient->expects($this->once())
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
        $this->valkeyClient->method('get')
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

        $this->valkeyClient->expects($this->exactly(3))
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

        $this->valkeyClient->method('get')
            ->with('publications:listings')
            ->willReturn(serialize([$oldListing]));

        $this->valkeyClient->expects($this->once())
            ->method('del')
            ->with(['publication:data:1']);

        $this->valkeyClient->expects($this->exactly(2))
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
