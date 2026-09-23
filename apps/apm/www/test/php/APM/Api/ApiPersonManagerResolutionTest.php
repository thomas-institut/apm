<?php

namespace APM\Api;

use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use APM\System\Config\VersionConfig;
use APM\System\Person\PersonManagerInterface;
use APM\System\SystemManager;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\StreamInterface;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class ApiPersonManagerResolutionTest extends TestCase
{
    public function testPersonCreateUsesContainerPersonManager(): void
    {
        $personManager = $this->createMock(PersonManagerInterface::class);
        $personManager->expects($this->once())
            ->method('createPerson')
            ->with('Name', 'Sort name', 1)
            ->willReturn(123);

        $requestBody = $this->createStub(StreamInterface::class);
        $requestBody->method('getContents')->willReturn('{"name":"Name","sortName":"Sort name"}');

        $request = $this->createStub(Request::class);
        $request->method('getBody')->willReturn($requestBody);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, new ApmSystemConfig(new VersionConfig('', '', ''))],
            [SystemManager::class, $this->createStub(SystemManager::class)],
            [ApmContainerKey::API_USER_ID, 1],
            [LoggerInterface::class, $this->createStub(LoggerInterface::class)],
            [PersonManagerInterface::class, $personManager],
        ]);

        (new ApiPeople($container))->personCreate($request, new Response());
    }
}