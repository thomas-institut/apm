<?php

namespace ThomasInstitut\StandardApi;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Slim\Factory\AppFactory;
use Slim\Interfaces\RouteCollectorInterface;
use Slim\Interfaces\RouteInterface;

class DummyController
{
    public function index(): void   {}
    public function index2(): void   {}
    public function index3(): void   {}
    public function index4(): void   {}
}

class RouteBuilderTest extends TestCase
{
    public function testBuildSuccess(): void
    {

        $app = AppFactory::create();
        $routeCollector = $app->getRouteCollector();
        $tuples = [
            ['GET', '/test/{id}', DummyController::class, 'index'],
            ['post', '/other', DummyController::class, 'index2'],
            ['any', '/anyone', DummyController::class, 'index3'],
            ['*', '/anytwo', DummyController::class, 'index4'],
        ];
        RouteBuilder::build($routeCollector, $tuples);
        $routes = array_values($routeCollector->getRoutes());
        $this->assertCount(4, $routes);

        $this->assertEquals(['GET'], $routes[0]->getMethods());
        $this->assertEquals($tuples[0][1], $routes[0]->getPattern());
        $this->assertEquals([DummyController::class, 'index'], $routes[0]->getCallable());

        $this->assertEquals(['POST'], $routes[1]->getMethods());
        $this->assertEquals($tuples[1][1], $routes[1]->getPattern());
        $this->assertEquals([DummyController::class, 'index2'], $routes[1]->getCallable());

        $this->assertEquals(RouteBuilder::AnyMethods, $routes[2]->getMethods());
        $this->assertEquals($tuples[2][1], $routes[2]->getPattern());
        $this->assertEquals([DummyController::class, 'index3'], $routes[2]->getCallable());

//
//        $this->assertEquals(RouteBuilder::AnyMethods, $routes[3]->getMethods());
//        $this->assertEquals($tuples[3][1], $routes[3]->getPattern());
//        $this->assertEquals([DummyController::class, 'index4'], $routes[3]->getCallable());
    }

    public function testBuildInvalidCount(): void
    {
        $routeCollector = $this->createMock(RouteCollectorInterface::class);
        $routeCollector->expects($this->never())->method('map');
        $tuples = [
            ['GET', '/test', DummyController::class]
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Tuple 0 does not have 4 elements');

        RouteBuilder::build($routeCollector, $tuples);
    }

    public function testBuildNotString(): void
    {
        $routeCollector = $this->createMock(RouteCollectorInterface::class);
        $routeCollector->expects($this->never())->method('map');
        $tuples = [
            ['GET', '/test', DummyController::class, 123]
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('In tuple 0, index 3 is not a string');

        RouteBuilder::build($routeCollector, $tuples);
    }

    public function testBuildEmptyString(): void
    {
        $routeCollector = $this->createMock(RouteCollectorInterface::class);
        $routeCollector->expects($this->never())->method('map');
        $tuples = [
            ['GET', '', DummyController::class, 'index']
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('In tuple 0, index 1 is empty');

        RouteBuilder::build($routeCollector, $tuples);
    }

    public function testBuildClassNotFound(): void
    {
        $routeCollector = $this->createMock(RouteCollectorInterface::class);
        $routeCollector->expects($this->never())->method('map');
        $tuples = [
            ['GET', '/test', 'NonExistentClass', 'index']
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('In tuple 0, class does not exist: NonExistentClass');

        RouteBuilder::build($routeCollector, $tuples);
    }

    public function testBuildMethodNotFound(): void
    {
        $routeCollector = $this->createMock(RouteCollectorInterface::class);
        $routeCollector->expects($this->never())->method('map');
        $tuples = [
            ['GET', '/test', DummyController::class, 'nonExistentMethod']
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('In tuple 0, method does not exist: ThomasInstitut\StandardApi\DummyController::nonExistentMethod');

        RouteBuilder::build($routeCollector, $tuples);
    }

    public function testBuildInvalidMethod(): void
    {
        $routeCollector = $this->createMock(RouteCollectorInterface::class);
        $routeCollector->expects($this->never())->method('map');
        $tuples = [
            ['INVALID', '/test', DummyController::class, 'index']
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid method: INVALID');

        RouteBuilder::build($routeCollector, $tuples);
    }
}
