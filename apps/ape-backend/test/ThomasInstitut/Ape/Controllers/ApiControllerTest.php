<?php

namespace ThomasInstitut\Ape\Controllers;

use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\ApiResponseFactory\ApiResponseFactory;

/**
 * @covers \ThomasInstitut\Ape\Controllers\ApiController
 */
class ApiControllerTest extends TestCase
{
    /**
     * Tests that the controller uses the logger provided by the container.
     */
    public function testConstructorUsesLoggerFromContainer(): void
    {
        $logger = $this->createStub(LoggerInterface::class);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())
            ->method('get')
            ->with(LoggerInterface::class)
            ->willReturn($logger);

        $controller = new TestApiController($container);

        $this->assertSame($logger, $controller->getLoggerInstance());
        $this->assertInstanceOf(ApiResponseFactory::class, $controller->getResponseFactoryInstance());
    }

    /**
     * Tests that the controller falls back to a NullLogger when the container throws.
     */
    public function testConstructorFallsBackToNullLoggerWhenContainerThrows(): void
    {
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())
            ->method('get')
            ->with(LoggerInterface::class)
            ->willThrowException(new TestApiControllerContainerException('no logger'));

        $controller = new TestApiController($container);

        $this->assertInstanceOf(NullLogger::class, $controller->getLoggerInstance());
    }

    /**
     * Tests that setApiCallName stores the value on the controller and response factory.
     */
    public function testSetApiCallNameUpdatesControllerAndResponseFactory(): void
    {
        $controller = new TestApiController($this->createContainerWithLogger());

        $controller->setApiCallName('PublicationController:list');

        $this->assertSame('PublicationController:list', $controller->getApiCallNameValue());
        $this->assertSame('PublicationController:list', $this->getResponseFactoryApiCallName($controller));
    }

    /**
     * Tests that setApiCallNameFromClassFunction formats the api call name correctly.
     */
    public function testSetApiCallNameFromClassFunctionFormatsName(): void
    {
        $controller = new TestApiController($this->createContainerWithLogger());

        $controller->setApiCallNameFromClassFunction(PublicationController::class, 'lastUpdate');

        $this->assertSame('PublicationController:lastUpdate', $controller->getApiCallNameValue());
        $this->assertSame('PublicationController:lastUpdate', $this->getResponseFactoryApiCallName($controller));
    }

    /**
     * Creates a container that returns a logger.
     */
    private function createContainerWithLogger(): ContainerInterface
    {
        $logger = $this->createStub(LoggerInterface::class);
        $container = $this->createMock(ContainerInterface::class);
        $container->expects($this->once())
            ->method('get')
            ->with(LoggerInterface::class)
            ->willReturn($logger);

        return $container;
    }

    /**
     * Reads the private apiCallName from the response factory.
     */
    private function getResponseFactoryApiCallName(TestApiController $controller): string
    {
        $reflection = new \ReflectionProperty(ApiResponseFactory::class, 'apiCallName');
//        $reflection->setAccessible(true);

        return $reflection->getValue($controller->getResponseFactoryInstance());
    }
}

/**
 * Test-specific ApiController subclass that exposes protected state.
 */
class TestApiController extends ApiController
{
    /**
     * Returns the logger instance stored by the parent controller.
     */
    public function getLoggerInstance(): LoggerInterface
    {
        return $this->logger;
    }

    /**
     * Returns the response factory stored by the parent controller.
     */
    public function getResponseFactoryInstance(): ApiResponseFactory
    {
        return $this->responseFactory;
    }

    /**
     * Returns the api call name stored by the parent controller.
     */
    public function getApiCallNameValue(): string
    {
        return $this->apiCallName;
    }
}

/**
 * Test exception used to simulate container failures in ApiController tests.
 */
class TestApiControllerContainerException extends \RuntimeException implements ContainerExceptionInterface
{
}

class TestContainerException extends \RuntimeException implements ContainerExceptionInterface{
}

class TestNotFoundException extends \RuntimeException implements ContainerExceptionInterface{}