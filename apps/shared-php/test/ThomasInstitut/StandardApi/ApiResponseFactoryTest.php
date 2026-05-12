<?php

namespace ThomasInstitut\StandardApi;

use PHPUnit\Framework\TestCase;
use Slim\Psr7\Response;
use ThomasInstitut\Http\HttpStatus;
use ThomasInstitut\Profiler\SystemProfiler;
use Psr\Log\LoggerInterface;

class ApiResponseFactoryTest extends TestCase
{
    private ApiResponseFactory $factory;

    protected function setUp(): void
    {
        $this->factory = new ApiResponseFactory();
        SystemProfiler::stop();
    }

    protected function tearDown(): void
    {
        SystemProfiler::stop();
    }

    public function testWithApiCallName(): void
    {
        // Single test for withApiCallName
        $result = $this->factory->withApiCallName('TestCall');
        $this->assertSame($this->factory, $result);
        
        // We can't directly check the private property, but we can check if it's used in logging
        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())
            ->method('debug')
            ->with($this->stringContains('API PROFILER TestCall'));

        $this->factory->setLogger($logger);
        SystemProfiler::start();
        
        $response = new Response();
        $this->factory->responseWithText($response, 'test');
    }

    public function testSystemProfilerLogging(): void
    {
        // Single test for SystemProfiler started
        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())
            ->method('debug')
            ->with($this->stringContains('API PROFILER'));

        $this->factory->setLogger($logger);
        SystemProfiler::start();
        
        $response = new Response();
        $this->factory->responseWithText($response, 'test');
    }

    public function testSuccess(): void
    {
        $response = new Response();
        $apiResponse = new ApiResponse();
        $apiResponse->result = ApiResponse::ResultSuccess;

        $result = $this->factory->success($response, $apiResponse);

        $this->assertEquals(HttpStatus::SUCCESS, $result->getStatusCode());
        $this->assertEquals('application/json', $result->getHeaderLine('Content-Type'));
        
        $body = (string)$result->getBody();
        $data = json_decode($body, true);
        $this->assertEquals(ApiResponse::ResultSuccess, $data['result']);
    }

    public function testResponseWithRawJson(): void
    {
        $response = new Response();
        $json = json_encode(['foo' => 'bar']);
        
        $result = $this->factory->responseWithRawJson($response, $json, HttpStatus::SUCCESS);

        $this->assertEquals(HttpStatus::SUCCESS, $result->getStatusCode());
        $this->assertEquals('application/json', $result->getHeaderLine('Content-Type'));
        $this->assertEquals($json, (string)$result->getBody());
    }

    public function testResponseWithJson(): void
    {
        $response = new Response();
        $data = ['foo' => 'bar'];
        
        $result = $this->factory->responseWithJson($response, $data);

        $this->assertEquals(HttpStatus::SUCCESS, $result->getStatusCode());
        $this->assertEquals('application/json', $result->getHeaderLine('Content-Type'));
        $this->assertEquals(json_encode($data), (string)$result->getBody());
    }

    public function testResponseWithText(): void
    {
        $response = new Response();
        $text = 'Hello World';
        
        $result = $this->factory->responseWithText($response, $text);

        $this->assertEquals(HttpStatus::SUCCESS, $result->getStatusCode());
        $this->assertEquals($text, (string)$result->getBody());
    }

    public function testResponseWithEmptyText(): void
    {
        $response = new Response();
        
        $result = $this->factory->responseWithText($response, '', HttpStatus::NOT_FOUND);

        $this->assertEquals(HttpStatus::NOT_FOUND, $result->getStatusCode());
        $this->assertEquals('', (string)$result->getBody());
    }

    public function testInternalServerError(): void
    {
        $response = new Response();
        $result = $this->factory->internalServerError($response, 'Something went wrong');

        $this->assertEquals(HttpStatus::INTERNAL_SERVER_ERROR, $result->getStatusCode());
        $body = (string)$result->getBody();
        $data = json_decode($body, true);
        $this->assertEquals(ApiResponse::ResultError, $data['result']);
        $this->assertEquals('Internal server error: Something went wrong', $data['message']);
    }

    public function testInternalServerErrorDefaultMessage(): void
    {
        $response = new Response();
        $result = $this->factory->internalServerError($response);

        $this->assertEquals(HttpStatus::INTERNAL_SERVER_ERROR, $result->getStatusCode());
        $body = (string)$result->getBody();
        $data = json_decode($body, true);
        $this->assertEquals('Internal server error', $data['message']);
    }

    public function testUnauthorized(): void
    {
        $response = new Response();
        $result = $this->factory->unauthorized($response, 'Invalid token');

        $this->assertEquals(HttpStatus::UNAUTHORIZED, $result->getStatusCode());
        $body = (string)$result->getBody();
        $data = json_decode($body, true);
        $this->assertEquals('Unauthorized: Invalid token', $data['message']);
    }

    public function testBadRequest(): void
    {
        $response = new Response();
        $result = $this->factory->badRequest($response, 'Missing parameter');

        $this->assertEquals(HttpStatus::BAD_REQUEST, $result->getStatusCode());
        $body = (string)$result->getBody();
        $data = json_decode($body, true);
        $this->assertEquals('Bad request: Missing parameter', $data['message']);
    }
}
