<?php

namespace Test\APM\Api;

use APM\Api\ApiPublication;
use APM\System\ApmContainerKey;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\PublicationManager\PublicationNotFoundException;
use APM\System\SystemManager;
use Monolog\Logger;
use PHPUnit\Framework\Attributes\AllowMockObjectsWithoutExpectations;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Response as SlimResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApiResponseFactory\ApiResponseFactory;

class ApiPublicationTest extends TestCase
{
    private MockObject|ContainerInterface $container;
    private MockObject|SystemManager $systemManager;
    private MockObject|PublicationManagerInterface $publicationManager;
    private Response $response;
    private MockObject|Request $request;
    private ApiPublication $controller;

    protected function setUp(): void
    {
        $this->container = $this->createMock(ContainerInterface::class);
        $this->systemManager = $this->createMock(SystemManager::class);
        $this->publicationManager = $this->createMock(PublicationManagerInterface::class);
        $this->response = new SlimResponse();
        $this->request = $this->createMock(Request::class);

        $logger = $this->createMock(Logger::class);
        $logger->method('withName')->willReturn($logger);

        $this->systemManager->method('getConfig')->willReturn(['languages' => [], 'devMode' => false]);
        $this->systemManager->method('getLogger')->willReturn($logger);
        $this->systemManager->method('getRouter')->willReturn($this->createMock(RouteParserInterface::class));

        $this->container->method('get')->willReturnMap([
            [SystemManager::class, $this->systemManager],
            [ApmContainerKey::API_USER_ID, 1],
            [PublicationManagerInterface::class, $this->publicationManager],
        ]);

        $this->controller = new ApiPublication($this->container);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testList(): void
    {
        $listings = [new PublicationListing()];
        $this->publicationManager->expects($this->once())
            ->method('list')
            ->willReturn($listings);

        $this->controller->list($this->request, $this->response);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testGetSuccess(): void
    {
        $id = 123;
        $this->request->method('getAttribute')->with('id')->willReturn((string)$id);

        $pubData = $this->createMock(PublicationData::class);
        $this->publicationManager->expects($this->once())
            ->method('getPublication')
            ->with($id)
            ->willReturn($pubData);

        $this->controller->get($this->request, $this->response);
    }

    #[AllowMockObjectsWithoutExpectations]
    public function testGetNotFound(): void
    {
        $id = 123;
        $this->request->method('getAttribute')->with('id')->willReturn((string)$id);

        $this->publicationManager->expects($this->once())
            ->method('getPublication')
            ->with($id)
            ->willThrowException(new PublicationNotFoundException("Not found"));

        $this->controller->get($this->request, $this->response);
    }
}
