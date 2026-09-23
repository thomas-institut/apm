<?php

namespace APM\Api;

use APM\System\ApmContainerKey;
use APM\System\Config\ApmSystemConfig;
use APM\System\Config\VersionConfig;
use APM\System\SystemManager;
use APM\System\User\UserManagerInterface;
use APM\System\User\UserTag;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use Slim\Psr7\Response;

class ApiUserManagerResolutionTest extends TestCase
{
    public function testStatementEditionUsesContainerUserManager(): void
    {
        $userManager = $this->createMock(UserManagerInterface::class);
        $userManager->expects($this->once())
            ->method('hasTag')
            ->with(1, UserTag::READ_ONLY)
            ->willReturn(true);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('get')->willReturnMap([
            [ApmSystemConfig::class, new ApmSystemConfig(new VersionConfig('', '', ''))],
            [SystemManager::class, $this->createStub(SystemManager::class)],
            [ApmContainerKey::API_USER_ID, 1],
            [LoggerInterface::class, $this->createStub(LoggerInterface::class)],
            [UserManagerInterface::class, $userManager],
        ]);

        $response = (new ApiEntity($container))->statementEdition($this->createStub(Request::class), new Response());

        $this->assertSame(403, $response->getStatusCode());
    }
}