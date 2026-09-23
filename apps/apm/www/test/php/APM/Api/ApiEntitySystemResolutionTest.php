<?php

namespace APM\Api;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use APM\System\Config\VersionConfig;
use APM\System\SystemManager;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class ApiEntitySystemResolutionTest extends TestCase
{
    public function testQualificationObjectsUseContainerEntitySystem(): void
    {
        $entitySystem = $this->createMock(ApmEntitySystemInterface::class);
        $entitySystem->expects($this->once())
            ->method('getValidQualificationObjects')
            ->with(true)
            ->willReturn([]);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, new ApmSystemConfig(new VersionConfig('', '', ''))],
            [SystemManager::class, $this->createStub(SystemManager::class)],
            [ApmContainerKey::API_USER_ID, 1],
            [LoggerInterface::class, $this->createStub(LoggerInterface::class)],
            [ApmEntitySystemInterface::class, $entitySystem],
        ]);

        (new ApiEntity($container))->getValidQualificationObjects($this->createStub(Request::class), new Response(), true);
    }
}