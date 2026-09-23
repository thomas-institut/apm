<?php

namespace APM\Api;

use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use APM\System\Config\VersionConfig;
use APM\System\EditionSourceManager;
use APM\System\SystemManager;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;
use ThomasInstitut\EntitySystem\Tid;

class ApiEditionSourcesTest extends TestCase
{
    /**
     * Confirms that the all-sources endpoint resolves its manager from the container.
     */
    public function testGetAllSourcesUsesContainerManager(): void
    {
        $editionSourceManager = $this->createMock(EditionSourceManager::class);
        $editionSourceManager->expects($this->once())
            ->method('getAllSources')
            ->willReturn([]);

        $controller = $this->createController($editionSourceManager);
        $controller->getAllSources($this->createStub(Request::class), new Response());
    }

    /**
     * Confirms that the single-source endpoint resolves its manager from the container.
     */
    public function testGetSourceByTidUsesContainerManager(): void
    {
        $tid = 123;
        $editionSourceManager = $this->createMock(EditionSourceManager::class);
        $editionSourceManager->expects($this->once())
            ->method('getSourceByTid')
            ->with($tid)
            ->willReturn([]);

        $request = $this->createMock(Request::class);
        $request->expects($this->once())
            ->method('getAttribute')
            ->with('tid')
            ->willReturn(Tid::toBase36String($tid));

        $controller = $this->createController($editionSourceManager);
        $controller->getSourceByTid($request, new Response());
    }

    /**
     * Creates the controller with the requested edition-source service.
     */
    private function createController(EditionSourceManager $editionSourceManager): ApiEditionSources
    {
        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, new ApmSystemConfig(new VersionConfig('', '', ''))],
            [SystemManager::class, $this->createStub(SystemManager::class)],
            [ApmContainerKey::API_USER_ID, 1],
            [LoggerInterface::class, $this->createStub(LoggerInterface::class)],
            [EditionSourceManager::class, $editionSourceManager],
        ]);

        return new ApiEditionSources($container);
    }
}