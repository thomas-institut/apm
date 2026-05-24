<?php

namespace ThomasInstitut\Ape\Controllers;

use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\Ape\Managers\PublicationNotFoundException;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;

/**
 * @covers \ThomasInstitut\Ape\Controllers\PublicationController
 */
class PublicationControllerTest extends TestCase
{
    /**
     * Tests that list() returns a successful response with the publication listings.
     */
    public function testListReturnsPublicationListings(): void
    {
        $publicationManager = $this->createMock(PublicationManager::class);
        $publicationManager->expects($this->once())
            ->method('getPublicationListings')
            ->willReturn([$this->createListing(17)]);

        $controller = new PublicationController($this->createContainerReturningPublicationManager($publicationManager));
        $response = $controller->list($this->createStub(ServerRequestInterface::class), $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('application/json', $response->getHeaderLine('Content-Type'));
        $this->assertSame('Success', $payload['result']);
        $this->assertCount(1, $payload['publications']);
        $this->assertSame(17, $payload['publications'][0]['id']);
        $this->assertSame('edition', $payload['publications'][0]['type']);
        $this->assertSame('Publication 17', $payload['publications'][0]['title']);
    }

    /**
     * Tests that list() returns an internal server error when the publication manager cannot be resolved.
     */
    public function testListReturnsInternalServerErrorWhenPublicationManagerIsMissing(): void
    {
        $controller = new PublicationController(
            $this->createContainerThrowingForPublicationManager(new TestNotFoundException('missing'))
        );
        $response = $controller->list($this->createStub(ServerRequestInterface::class), $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame('Error', $payload['result']);
        $this->assertSame('Internal server error: PublicationManager not found', $payload['message']);
        $this->assertSame(500, $payload['httpStatus']);
    }

    /**
     * Tests that get() returns a bad request when no publication id is given.
     */
    public function testGetReturnsBadRequestWhenIdIsMissing(): void
    {
        $controller = new PublicationController($this->createContainerWithLoggerOnly());
        $request = (new ServerRequestFactory())->createServerRequest('GET', '/api/publication/get');

        $response = $controller->get($request, $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame('Error', $payload['result']);
        $this->assertSame('Bad request: No publication id given', $payload['message']);
        $this->assertSame(400, $payload['httpStatus']);
    }

    /**
     * Tests that get() returns a bad request when the publication id is not numeric.
     */
    public function testGetReturnsBadRequestWhenIdIsNotNumeric(): void
    {
        $controller = new PublicationController($this->createContainerWithLoggerOnly());
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/publication/not-a-number/get')
            ->withAttribute('id', 'not-a-number');

        $response = $controller->get($request, $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame('Error', $payload['result']);
        $this->assertSame('Bad request: Invalid publication id', $payload['message']);
        $this->assertSame(400, $payload['httpStatus']);
    }

    /**
     * Tests that get() returns an internal server error when the publication manager cannot be resolved.
     */
    public function testGetReturnsInternalServerErrorWhenPublicationManagerIsMissing(): void
    {
        $controller = new PublicationController(
            $this->createContainerThrowingForPublicationManager(new TestContainerException('broken container'))
        );
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/publication/23/get')
            ->withAttribute('id', '23');

        $response = $controller->get($request, $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame('Error', $payload['result']);
        $this->assertSame('Internal server error: PublicationManager not found', $payload['message']);
        $this->assertSame(500, $payload['httpStatus']);
    }

    /**
     * Tests that get() returns a not found response when the publication does not exist.
     */
    public function testGetReturnsNotFoundWhenPublicationDoesNotExist(): void
    {
        $publicationManager = $this->createMock(PublicationManager::class);
        $publicationManager->expects($this->once())
            ->method('getPublicationData')
            ->with(12)
            ->willThrowException(new PublicationNotFoundException('missing'));

        $controller = new PublicationController($this->createContainerReturningPublicationManager($publicationManager));
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/publication/12/get')
            ->withAttribute('id', '12');

        $response = $controller->get($request, $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(404, $response->getStatusCode());
        $this->assertSame('Error', $payload['result']);
        $this->assertSame('Not found: Publication 12 not found', $payload['message']);
        $this->assertSame(404, $payload['httpStatus']);
    }

    /**
     * Tests that get() returns a successful response with the publication data.
     */
    public function testGetReturnsPublicationData(): void
    {
        $publicationData = $this->createPublicationData(42);

        $publicationManager = $this->createMock(PublicationManager::class);
        $publicationManager->expects($this->once())
            ->method('getPublicationData')
            ->with(42)
            ->willReturn($publicationData);

        $controller = new PublicationController($this->createContainerReturningPublicationManager($publicationManager));
        $request = (new ServerRequestFactory())
            ->createServerRequest('GET', '/api/publication/42/get')
            ->withAttribute('id', '42');

        $response = $controller->get($request, $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('application/json', $response->getHeaderLine('Content-Type'));
        $this->assertSame('Success', $payload['result']);
        $this->assertSame(42, $payload['publicationData']['id']);
        $this->assertSame('Text of publication 42', $payload['publicationData']['text']);
        $this->assertSame('Publication 42', $payload['publicationData']['title']);
    }

    /**
     * Tests that lastUpdate() returns a successful response with the last update timestamp.
     */
    public function testLastUpdateReturnsTimestamp(): void
    {
        $publicationManager = $this->createMock(PublicationManager::class);
        $publicationManager->expects($this->once())
            ->method('getLastUpdateTimestamp')
            ->willReturn(1716474540);

        $controller = new PublicationController($this->createContainerReturningPublicationManager($publicationManager));
        $response = $controller->lastUpdate($this->createStub(ServerRequestInterface::class), $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Success', $payload['result']);
        $this->assertSame(1716474540, $payload['apmLastUpdate']);
    }

    /**
     * Tests that lastUpdate() returns an internal server error when the publication manager cannot be resolved.
     */
    public function testLastUpdateReturnsInternalServerErrorWhenPublicationManagerIsMissing(): void
    {
        $controller = new PublicationController(
            $this->createContainerThrowingForPublicationManager(new TestNotFoundException('missing'))
        );
        $response = $controller->lastUpdate($this->createStub(ServerRequestInterface::class), $this->createResponse());
        $payload = $this->decodeResponse($response);

        $this->assertSame(500, $response->getStatusCode());
        $this->assertSame('Error', $payload['result']);
        $this->assertSame('Internal server error: PublicationManager not found', $payload['message']);
        $this->assertSame(500, $payload['httpStatus']);
    }

    /**
     * Creates a response object for controller tests.
     */
    private function createResponse(): Response
    {
        return new Response();
    }

    /**
     * Creates a container that provides only a logger.
     */
    private function createContainerWithLoggerOnly(): ContainerInterface
    {
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())
            ->method('get')
            ->with(LoggerInterface::class)
            ->willReturn($this->createStub(LoggerInterface::class));

        return $container;
    }

    /**
     * Creates a container that returns the given publication manager.
     */
    private function createContainerReturningPublicationManager(PublicationManager $publicationManager): ContainerInterface
    {
        $logger = $this->createStub(LoggerInterface::class);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->exactly(2))
            ->method('get')
            ->willReturnCallback(static function (string $id) use ($logger, $publicationManager): mixed {
                return match ($id) {
                    LoggerInterface::class => $logger,
                    PublicationManager::class => $publicationManager,
                    default => throw new TestContainerException("Unexpected container id: $id"),
                };
            });

        return $container;
    }

    /**
     * Creates a container that throws when the publication manager is requested.
     */
    private function createContainerThrowingForPublicationManager(\Throwable $exception): ContainerInterface
    {
        $logger = $this->createStub(LoggerInterface::class);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->exactly(2))
            ->method('get')
            ->willReturnCallback(static function (string $id) use ($logger, $exception): mixed {
                return match ($id) {
                    LoggerInterface::class => $logger,
                    PublicationManager::class => throw $exception,
                    default => throw new TestContainerException("Unexpected container id: $id"),
                };
            });

        return $container;
    }

    /**
     * Decodes a JSON response body into an associative array.
     *
     * @return array<string, mixed>
     */
    private function decodeResponse(ResponseInterface $response): array
    {
        return json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);
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
        $publicationData->type = 'edition';
        $publicationData->versionTimeString = '2026-05-24 10:00:00.000000';
        $publicationData->title = "Publication $id";
        $publicationData->description = "Description $id";
        $publicationData->text = "Text of publication $id";

        return $publicationData;
    }
}
