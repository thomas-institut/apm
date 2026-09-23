<?php

namespace APM\Api;

use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use APM\System\Config\VersionConfig;
use APM\System\Events\EntityDataChanged;
use APM\System\Events\EntityDataChangedPayload;
use APM\System\Events\EventListener;
use APM\System\Events\EventManager;
use APM\System\Events\EventRegistry;
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
        $eventListener = new class implements EventListener {
            public ?object $payload = null;

            public function handle(object $payload): void
            {
                $this->payload = $payload;
            }
        };
        $eventManager = new EventManager($container, new EventRegistry([
            EntityDataChanged::class => [
                'payload' => EntityDataChangedPayload::class,
                'listeners' => [$eventListener::class],
            ],
        ]));
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, new ApmSystemConfig(new VersionConfig('', '', ''))],
            [SystemManager::class, $this->createStub(SystemManager::class)],
            [ApmContainerKey::API_USER_ID, 1],
            [LoggerInterface::class, $this->createStub(LoggerInterface::class)],
            [PersonManagerInterface::class, $personManager],
            [EventManager::class, $eventManager],
            [$eventListener::class, $eventListener],
        ]);

        (new ApiPeople($container))->personCreate($request, new Response());

        $this->assertInstanceOf(EntityDataChangedPayload::class, $eventListener->payload);
        $this->assertSame(123, $eventListener->payload->entityIdOrIds);
        $this->assertSame(1, $eventListener->payload->userId);
    }
}