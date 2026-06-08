<?php

namespace ThomasInstitut\Ape\Managers;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Predis\ClientInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;

/**
 * Test-specific interface exposing the Valkey methods used by the manager.
 */
interface PredisClientMethodsInterface extends ClientInterface
{
    /**
     * Gets a value from Valkey.
     */
    public function get(string $key): mixed;

    /**
     * Sets a value in Valkey.
     */
    public function set(string $key, mixed $value): mixed;

    /**
     * Deletes one or more keys from Valkey.
     */
    public function del(array|string $keyOrKeys): int;
}

/**
 * @covers \ThomasInstitut\Ape\Managers\ValkeyPublicationManager
 */
class ValkeyPublicationManagerTest extends TestCase
{
    /**
     * Tests that getPublicationListings() returns an empty array when no data is present.
     */
    public function testGetPublicationListingsReturnsEmptyArrayWhenNoData(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(null);

        $manager = $this->createManager($valkeyClient);

        $this->assertSame([], $manager->getPublicationListings());
    }

    /**
     * Tests that getPublicationListings() unserializes the stored publication listings.
     */
    public function testGetPublicationListingsReturnsUnserializedData(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $listings = [$this->createListing(1)];

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize($listings));

        $manager = $this->createManager($valkeyClient);
        $result = $manager->getPublicationListings();

        $this->assertCount(1, $result);
        $this->assertInstanceOf(PublicationListing::class, $result[0]);
        $this->assertSame(1, $result[0]->id);
        $this->assertSame('Publication 1', $result[0]->title);
    }

    /**
     * Tests that getPublicationData() returns the unserialized publication data.
     */
    public function testGetPublicationDataReturnsUnserializedData(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $publicationData = $this->createPublicationData(7);

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publication:data:7')
            ->willReturn(serialize($publicationData));

        $manager = $this->createManager($valkeyClient);
        $result = $manager->getPublicationData(7);

        $this->assertInstanceOf(TextPublicationData::class, $result);
        $this->assertSame(7, $result->id);
        $this->assertSame('Text of publication 7', $result->text);
    }

    /**
     * Tests that getPublicationData() throws when the publication is not present.
     */
    public function testGetPublicationDataThrowsExceptionWhenNotFound(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publication:data:1')
            ->willReturn(null);

        $manager = $this->createManager($valkeyClient);

        $this->expectException(PublicationNotFoundException::class);
        $manager->getPublicationData(1);
    }

    /**
     * Tests that getLastUpdateTimestamp() returns zero when no timestamp is present.
     */
    public function testGetLastUpdateTimestampReturnsZeroWhenNoData(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:lastUpdate')
            ->willReturn(null);

        $manager = $this->createManager($valkeyClient);

        $this->assertSame(0, $manager->getLastUpdateTimestamp());
    }

    /**
     * Tests that getLastUpdateTimestamp() returns the integer timestamp from Valkey.
     */
    public function testGetLastUpdateTimestampReturnsValueFromValkey(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $timestamp = 1621773840;
        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:lastUpdate')
            ->willReturn((string)$timestamp);

        $manager = $this->createManager($valkeyClient);

        $this->assertSame($timestamp, $manager->getLastUpdateTimestamp());
    }

    /**
     * Tests that updateFromApm() fetches and stores a new publication.
     *
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmHandlesNewPublication(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);

        $listing = $this->createListing(1);
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$listing];

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(null);

        $data = $this->createPublicationData(1);
        $getResponse = new PublicationApiGetResponse();
        $getResponse->publicationData = $data;

        $apiClient->expects($this->once())
            ->method('get')
            ->with(1)
            ->willReturn($getResponse);

        $valkeyClient->expects($this->never())
            ->method('del');

        $valkeyClient->expects($this->exactly(3))
            ->method('set')
            ->willReturnCallback(function (string $key, mixed $value) use ($data, $listing): mixed {
                static $count = 0;
                if ($count === 0) {
                    $this->assertSame('publication:data:1', $key);
                    $this->assertSame(serialize($data), $value);
                } elseif ($count === 1) {
                    $this->assertSame('publications:listings', $key);
                    $this->assertSame(serialize([$listing]), $value);
                } else {
                    $this->assertSame('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $logger->expects($this->never())
            ->method('error');

        $manager->updateFromApm();
    }

    /**
     * Tests that updateFromApm() keeps unchanged publications without refetching their data.
     *
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmKeepsUnchangedPublicationWithoutRefetchingData(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);

        $localListing = $this->createListing(2);
        $apmListing = $this->createListing(2);
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$apmListing];

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);
        $apiClient->expects($this->never())
            ->method('get');

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize([$localListing]));
        $valkeyClient->expects($this->never())
            ->method('del');

        $valkeyClient->expects($this->exactly(2))
            ->method('set')
            ->willReturnCallback(function (string $key, mixed $value) use ($localListing): mixed {
                static $count = 0;
                if ($count === 0) {
                    $this->assertSame('publications:listings', $key);
                    $this->assertSame(serialize([$localListing]), $value);
                } else {
                    $this->assertSame('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $logger->expects($this->never())
            ->method('error');

        $manager->updateFromApm();
    }

    /**
     * Tests that updateFromApm() refreshes cached data when the publication version changes.
     *
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmRefetchesDataWhenPublicationVersionChanges(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);

        $localListing = $this->createListing(3, '2026-05-24 10:00:00.000000', 'Old title', 'Old description');
        $apmListing = $this->createListing(3, '2026-05-25 10:00:00.000000', 'New title', 'New description');
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$apmListing];

        $publicationData = $this->createPublicationData(3);
        $getResponse = new PublicationApiGetResponse();
        $getResponse->publicationData = $publicationData;

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);
        $apiClient->expects($this->once())
            ->method('get')
            ->with(3)
            ->willReturn($getResponse);

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize([$localListing]));
        $valkeyClient->expects($this->never())
            ->method('del');

        $valkeyClient->expects($this->exactly(3))
            ->method('set')
            ->willReturnCallback(function (string $key, mixed $value) use ($publicationData, $apmListing): mixed {
                static $count = 0;
                if ($count === 0) {
                    $this->assertSame('publication:data:3', $key);
                    $this->assertSame(serialize($publicationData), $value);
                } elseif ($count === 1) {
                    $this->assertSame('publications:listings', $key);
                    $this->assertSame(serialize([$apmListing]), $value);
                } else {
                    $this->assertSame('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $logger->expects($this->never())
            ->method('error');

        $manager->updateFromApm();
    }

    /**
     * Tests that updateFromApm() updates listings when only metadata changes.
     *
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmUpdatesListingWithoutRefetchingDataWhenOnlyMetadataChanges(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);

        $localListing = $this->createListing(3, '2026-05-24 10:00:00.000000', 'Old title', 'Old description');
        $apmListing = $this->createListing(3, '2026-05-24 10:00:00.000000', 'New title', 'New description');
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$apmListing];

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);
        $apiClient->expects($this->never())
            ->method('get');

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize([$localListing]));
        $valkeyClient->expects($this->never())
            ->method('del');

        $valkeyClient->expects($this->exactly(2))
            ->method('set')
            ->willReturnCallback(function (string $key, mixed $value) use ($apmListing): mixed {
                static $count = 0;
                if ($count === 0) {
                    $this->assertSame('publications:listings', $key);
                    $this->assertSame(serialize([$apmListing]), $value);
                } else {
                    $this->assertSame('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $logger->expects($this->never())
            ->method('error');

        $manager->updateFromApm();
    }

    /**
     * Tests that updateFromApm() removes publications no longer present in APM.
     *
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmHandlesRemoval(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);

        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [];

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        $oldListing = $this->createListing(1);

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize([$oldListing]));

        $valkeyClient->expects($this->once())
            ->method('del')
            ->with(['publication:data:1']);

        $valkeyClient->expects($this->exactly(2))
            ->method('set')
            ->willReturnCallback(function (string $key, mixed $value): mixed {
                static $count = 0;
                if ($count === 0) {
                    $this->assertSame('publications:listings', $key);
                    $this->assertSame(serialize([]), $value);
                } else {
                    $this->assertSame('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $logger->expects($this->never())
            ->method('error');

        $manager->updateFromApm();
    }

    /**
     * Tests that updateFromApm() deletes multiple stale publications.
     *
     * @throws ApmCommunicationProblemException
     */
    public function testUpdateFromApmRemovesMultipleStalePublications(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $manager = $this->createManager($valkeyClient, $apiClient);

        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [];

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        $localListings = [$this->createListing(10), $this->createListing(11)];
        $removedKeys = [];

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(serialize($localListings));

        $valkeyClient->expects($this->exactly(2))
            ->method('del')
            ->willReturnCallback(function (array|string $keyOrKeys) use (&$removedKeys): int {
                $removedKeys[] = $keyOrKeys;
                return 1;
            });

        $valkeyClient->expects($this->exactly(2))
            ->method('set')
            ->willReturnCallback(function (string $key, mixed $value): mixed {
                static $count = 0;
                if ($count === 0) {
                    $this->assertSame('publications:listings', $key);
                    $this->assertSame(serialize([]), $value);
                } else {
                    $this->assertSame('publications:lastUpdate', $key);
                    $this->assertIsNumeric($value);
                }
                $count++;
                return null;
            });

        $manager->updateFromApm();

        $this->assertSame([
            ['publication:data:10'],
            ['publication:data:11'],
        ], $removedKeys);
    }

    /**
     * Tests that updateFromApm() wraps list failures and logs them.
     */
    public function testUpdateFromApmWrapsListFailuresAndLogsThem(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);
        $previous = new \RuntimeException('upstream failed');

        $apiClient->expects($this->once())
            ->method('list')
            ->willThrowException($previous);

        $valkeyClient->expects($this->never())
            ->method('get');
        $valkeyClient->expects($this->never())
            ->method('set');
        $valkeyClient->expects($this->never())
            ->method('del');

        $logger->expects($this->once())
            ->method('error')
            ->with('Error updating from APM: upstream failed');

        try {
            $manager->updateFromApm();
            $this->fail('Expected ApmCommunicationProblemException to be thrown.');
        } catch (ApmCommunicationProblemException $exception) {
            $this->assertSame('Error updating from APM', $exception->getMessage());
            $this->assertSame($previous, $exception->getPrevious());
        }
    }

    /**
     * Tests that updateFromApm() wraps publication fetch failures and logs them.
     */
    public function testUpdateFromApmWrapsPublicationFetchFailuresAndLogsThem(): void
    {
        $valkeyClient = $this->createMock(PredisClientMethodsInterface::class);
        $apiClient = $this->createMock(PublicationApiClient::class);
        $logger = $this->createMock(LoggerInterface::class);
        $manager = $this->createManager($valkeyClient, $apiClient, $logger);

        $listing = $this->createListing(4);
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$listing];
        $previous = new \RuntimeException('detail fetch failed');

        $apiClient->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);
        $apiClient->expects($this->once())
            ->method('get')
            ->with(4)
            ->willThrowException($previous);

        $valkeyClient->expects($this->once())
            ->method('get')
            ->with('publications:listings')
            ->willReturn(null);
        $valkeyClient->expects($this->never())
            ->method('set');
        $valkeyClient->expects($this->never())
            ->method('del');

        $logger->expects($this->once())
            ->method('error')
            ->with('Error fetching data for publication 4: detail fetch failed');

        try {
            $manager->updateFromApm();
            $this->fail('Expected ApmCommunicationProblemException to be thrown.');
        } catch (ApmCommunicationProblemException $exception) {
            $this->assertSame('Error fetching data for publication 4', $exception->getMessage());
            $this->assertSame($previous, $exception->getPrevious());
        }
    }

    /**
     * Creates a manager with optional test doubles.
     */
    private function createManager(
        PredisClientMethodsInterface $valkeyClient,
        ?PublicationApiClient $apiClient = null,
        ?LoggerInterface $logger = null
    ): ValkeyPublicationManager {
        return new ValkeyPublicationManager(
            $valkeyClient,
            $apiClient ?? $this->createStub(PublicationApiClient::class),
            $logger ?? $this->createStub(LoggerInterface::class)
        );
    }

    /**
     * Creates a publication listing with initialized fields.
     */
    private function createListing(
        int $id,
        string $versionTimeString = '2026-05-24 10:00:00.000000',
        string $title = '',
        string $description = ''
    ): PublicationListing {
        $listing = new PublicationListing();
        $listing->id = $id;
        $listing->type = PublicationType::Edition;
        $listing->versionTimeString = $versionTimeString;
        $listing->title = $title !== '' ? $title : "Publication $id";
        $listing->description = $description !== '' ? $description : "Description $id";

        return $listing;
    }

    /**
     * Creates publication data with initialized fields.
     */
    private function createPublicationData(int $id): TextPublicationData
    {
        $publicationData = new TextPublicationData();
        $publicationData->id = $id;
        $publicationData->type = PublicationType::Text;
        $publicationData->versionTimeString = '2026-05-24 10:00:00.000000';
        $publicationData->title = "Publication $id";
        $publicationData->description = "Description $id";
        $publicationData->text = "Text of publication $id";

        return $publicationData;
    }
}
