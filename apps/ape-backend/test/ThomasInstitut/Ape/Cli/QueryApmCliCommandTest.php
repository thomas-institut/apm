<?php

namespace ThomasInstitut\Ape\Cli;

use DI\Container;
use DI\DependencyException;
use DI\NotFoundException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\ApmPublicationApi\Client\HttpClientException;
use ThomasInstitut\ApmPublicationApi\Client\InvalidResponseFromServerException;
use ThomasInstitut\ApmPublicationApi\Client\NotFoundException as PublicationApiClientNotFoundException;
use ThomasInstitut\ApmPublicationApi\Client\PublicationApiClient;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;

/**
 * @covers \ThomasInstitut\Ape\Cli\QueryApmCliCommand
 */
class QueryApmCliCommandTest extends TestCase
{
    /**
     * Tests that run() fails when no subcommand is provided.
     */
    public function testRunReturnsFailureWhenNoCommandIsGiven(): void
    {
        $command = new QueryApmCliCommand($this->createStub(Container::class));

        $result = $command->run(0, []);

        $this->assertFalse($result->success);
        $this->assertSame('No command given', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that run() fails for an invalid subcommand.
     */
    public function testRunReturnsFailureForInvalidCommand(): void
    {
        $command = new QueryApmCliCommand($this->createStub(Container::class));

        $result = $command->run(1, ['bogus']);

        $this->assertFalse($result->success);
        $this->assertSame('Invalid command', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that list() prints a message when APM returns no publications.
     */
    public function testRunListPrintsNoPublicationsFoundWhenResponseIsEmpty(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [];
        $client->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        ob_start();
        $result = $command->run(1, ['list']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertSame('', $result->message);
        $this->assertStringContainsString('No publications found', $output);
    }

    /**
     * Tests that list() prints the publication rows from the APM response.
     */
    public function testRunListPrintsPublicationRows(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $listing = $this->createListing(5);
        $listResponse = new PublicationApiListResponse();
        $listResponse->publications = [$listing];
        $client->expects($this->once())
            ->method('list')
            ->willReturn($listResponse);

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        ob_start();
        $result = $command->run(1, ['list']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertStringContainsString(' 1:    5 edition Publication 5', $output);
    }

    /**
     * Tests that list() reports an unavailable APM client when the container lookup fails.
     */
    public function testRunListReturnsFailureWhenClientIsUnavailable(): void
    {
        $command = new QueryApmCliCommand(
            $this->createContainerThrowingForClient(new NotFoundException('missing client'))
        );

        $result = $command->run(1, ['list']);

        $this->assertFalse($result->success);
        $this->assertSame('APM client not available', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that list() reports HTTP client errors.
     */
    public function testRunListReturnsFailureForHttpErrors(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $client->expects($this->once())
            ->method('list')
            ->willThrowException(new HttpClientException('network down'));

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        $result = $command->run(1, ['list']);

        $this->assertFalse($result->success);
        $this->assertSame('Http error querying APM: network down', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that list() reports invalid responses from the server.
     */
    public function testRunListReturnsFailureForInvalidResponses(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $client->expects($this->once())
            ->method('list')
            ->willThrowException(new InvalidResponseFromServerException('bad payload'));

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        $result = $command->run(1, ['list']);

        $this->assertFalse($result->success);
        $this->assertSame('Bad response from APM: bad payload', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that list() maps an APM 404 into a friendly error message.
     */
    public function testRunListReturnsFailureWhenApmReturnsNotFound(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $client->expects($this->once())
            ->method('list')
            ->willThrowException(new PublicationApiClientNotFoundException('not found'));

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        $result = $command->run(1, ['list']);

        $this->assertFalse($result->success);
        $this->assertSame('APM returned 404', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that get() fails when no publication id is provided.
     */
    public function testRunGetReturnsFailureWhenIdIsMissing(): void
    {
        $command = new QueryApmCliCommand($this->createStub(Container::class));

        $result = $command->run(1, ['get']);

        $this->assertFalse($result->success);
        $this->assertSame('No publication id given', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that get() fails when the publication id is invalid.
     */
    public function testRunGetReturnsFailureWhenIdIsInvalid(): void
    {
        $command = new QueryApmCliCommand($this->createStub(Container::class));

        $result = $command->run(2, ['get', 'not-a-number']);

        $this->assertFalse($result->success);
        $this->assertSame('Invalid publication id', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that get() prints the publication data returned by APM.
     */
    public function testRunGetPrintsPublicationData(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $getResponse = new PublicationApiGetResponse();
        $getResponse->publicationData = $this->createPublicationData(9);
        $client->expects($this->once())
            ->method('get')
            ->with(9)
            ->willReturn($getResponse);

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        ob_start();
        $result = $command->run(2, ['get', '9']);
        $output = ob_get_clean();

        $this->assertTrue($result->success);
        $this->assertStringContainsString('Publication 9', $output);
        $this->assertStringContainsString('Text of publication 9', $output);
    }

    /**
     * Tests that get() reports an unavailable APM client when the container lookup fails.
     */
    public function testRunGetReturnsFailureWhenClientIsUnavailable(): void
    {
        $command = new QueryApmCliCommand(
            $this->createContainerThrowingForClient(new DependencyException('missing client'))
        );

        $result = $command->run(2, ['get', '9']);

        $this->assertFalse($result->success);
        $this->assertSame('APM client not available', $result->message);
        $this->assertTrue($result->printUsage);
    }

    /**
     * Tests that get() reports HTTP client errors.
     */
    public function testRunGetReturnsFailureForHttpErrors(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $client->expects($this->once())
            ->method('get')
            ->with(9)
            ->willThrowException(new HttpClientException('timeout'));

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        $result = $command->run(2, ['get', '9']);

        $this->assertFalse($result->success);
        $this->assertSame('Http error querying APM: timeout', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that get() reports invalid responses from the server.
     */
    public function testRunGetReturnsFailureForInvalidResponses(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $client->expects($this->once())
            ->method('get')
            ->with(9)
            ->willThrowException(new InvalidResponseFromServerException('invalid json'));

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        $result = $command->run(2, ['get', '9']);

        $this->assertFalse($result->success);
        $this->assertSame('Bad response from APM: invalid json', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Tests that get() maps an APM 404 into a publication-not-found message.
     */
    public function testRunGetReturnsFailureWhenPublicationIsNotFound(): void
    {
        $client = $this->createMock(PublicationApiClient::class);
        $client->expects($this->once())
            ->method('get')
            ->with(9)
            ->willThrowException(new PublicationApiClientNotFoundException('not found'));

        $command = new QueryApmCliCommand($this->createContainerReturningClient($client));

        $result = $command->run(2, ['get', '9']);

        $this->assertFalse($result->success);
        $this->assertSame('Publication not found', $result->message);
        $this->assertFalse($result->printUsage);
    }

    /**
     * Creates a DI container that returns the given publication API client.
     */
    private function createContainerReturningClient(PublicationApiClient $client): Container
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(PublicationApiClient::class)
            ->willReturn($client);

        return $container;
    }

    /**
     * Creates a DI container that throws when the publication API client is requested.
     */
    private function createContainerThrowingForClient(\Throwable $exception): Container
    {
        $container = $this->createMock(Container::class);
        $container->expects($this->once())
            ->method('get')
            ->with(PublicationApiClient::class)
            ->willThrowException($exception);

        return $container;
    }

    /**
     * Creates a publication listing with initialized fields.
     */
    private function createListing(int $id): PublicationListing
    {
        $listing = new PublicationListing();
        $listing->id = $id;
        $listing->type = 'edition';
        $listing->versionTimeString = '2026-05-24 10:00:00.000000';
        $listing->title = "Publication $id";
        $listing->description = "Description $id";

        return $listing;
    }

    /**
     * Creates publication data with initialized fields.
     */
    private function createPublicationData(int $id): TextPublicationData
    {
        $publicationData = new TextPublicationData();
        $publicationData->id = $id;
        $publicationData->type = 'text';
        $publicationData->versionTimeString = '2026-05-24 10:00:00.000000';
        $publicationData->title = "Publication $id";
        $publicationData->description = "Description $id";
        $publicationData->text = "Text of publication $id";

        return $publicationData;
    }
}
