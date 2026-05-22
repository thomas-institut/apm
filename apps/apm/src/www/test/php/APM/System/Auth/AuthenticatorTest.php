<?php

namespace APM\Test\System\Auth;

use APM\Api\DataSchema\ApiLoginRequest;
use APM\System\Auth\Authenticator;
use APM\System\User\UserManagerInterface;
use Monolog\Handler\NullHandler;
use Monolog\Logger;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;
use ReflectionClass;
use ReflectionException;
use ReflectionMethod;
use ReflectionProperty;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\StreamFactory;
use Slim\Psr7\Response;
use ThomasInstitut\ApiResponseFactory\ApiResponseFactory;

/**
 * @internal
 *
 * Tests for Authenticator request parsing behavior.
 */
class AuthenticatorTest extends TestCase
{
    /**
     * Tests that invalid JSON payloads are rejected.
     *
     * @return void
     * @throws ReflectionException
     */
    public function testParseApiLoginRequestDataRejectsInvalidJson(): void
    {
        $authenticator = $this->createAuthenticatorWithoutConstructor();
        $request = $this->buildRequest('{invalid json');

        $result = $this->invokeParseApiLoginRequestData($authenticator, $request);

        $this->assertNull($result);
    }

    /**
     * Tests that payloads missing required fields are rejected.
     *
     * @return void
     * @throws ReflectionException
     */
    public function testParseApiLoginRequestDataRejectsPayloadWithoutPwd(): void
    {
        $authenticator = $this->createAuthenticatorWithoutConstructor();
        $request = $this->buildRequest('{"user":"alice"}');

        $result = $this->invokeParseApiLoginRequestData($authenticator, $request);

        $this->assertNull($result);
    }

    /**
     * Tests that valid payloads map to the typed DTO.
     *
     * @return void
     * @throws ReflectionException
     */
    public function testParseApiLoginRequestDataMapsValidPayload(): void
    {
        $authenticator = $this->createAuthenticatorWithoutConstructor();
        $request = $this->buildRequest('{"user":"alice","pwd":"secret","rememberMe":"on"}');

        $result = $this->invokeParseApiLoginRequestData($authenticator, $request);

        $this->assertInstanceOf(ApiLoginRequest::class, $result);
        $this->assertSame('alice', $result->user);
        $this->assertSame('secret', $result->pwd);
        $this->assertSame('on', $result->rememberMe);
    }

    /**
     * Tests that non-string rememberMe values are rejected.
     *
     * @return void
     * @throws ReflectionException
     */
    public function testParseApiLoginRequestDataRejectsNonStringRememberMe(): void
    {
        $authenticator = $this->createAuthenticatorWithoutConstructor();
        $request = $this->buildRequest('{"user":"alice","pwd":"secret","rememberMe":true}');

        $result = $this->invokeParseApiLoginRequestData($authenticator, $request);

        $this->assertNull($result);
    }

    /**
     * Tests that apiLogin uses raw username and password values for authentication.
     *
     * @throws ReflectionException
     */
    public function testApiLoginUsesRawCredentialsWithoutHtmlEscaping(): void
    {
        $authenticator = $this->createAuthenticatorWithoutConstructor();
        $logger = new Logger('test');
        $logger->pushHandler(new NullHandler());

        $userManager = $this->createMock(UserManagerInterface::class);
        $rawUser = 'alice<script>';
        $rawPassword = 'p<ss&word"';

        $userManager->expects($this->once())
            ->method('getUserIdForUserName')
            ->with($rawUser)
            ->willReturn(42);

        $userManager->expects($this->once())
            ->method('verifyPassword')
            ->with(42, $rawPassword)
            ->willReturn(false);

        $this->setProperty($authenticator, 'logger', $logger);
        $this->setProperty($authenticator, 'siteLogger', $logger);
        $this->setProperty($authenticator, 'apiLogger', $logger);
        $this->setProperty($authenticator, 'userManager', $userManager);
        $this->setProperty($authenticator, 'responseFactory', new ApiResponseFactory());



        $request = $this->buildRequest( json_encode(['user' => $rawUser, 'pwd' => $rawPassword, 'rememberMe' => '']));
        $response = new Response();

        $result = $authenticator->apiLogin($request, $response);

        $this->assertSame(401, $result->getStatusCode());
    }

    /**
     * Creates an Authenticator instance without running its constructor.
     *
     * @return Authenticator
     * @throws ReflectionException
     */
    private function createAuthenticatorWithoutConstructor(): Authenticator
    {
        return (new ReflectionClass(Authenticator::class))->newInstanceWithoutConstructor();
    }

    /**
     * Builds a server request with JSON body content.
     *
     * @param string $json
     * @return ServerRequestInterface
     */
    private function buildRequest(string $json): ServerRequestInterface
    {
        $request = (new ServerRequestFactory())->createServerRequest('POST', '/api/login');
        $stream = (new StreamFactory())->createStream($json);
        return $request->withBody($stream);
    }

    /**
     * Invokes the private parse method under test.
     *
     * @param Authenticator $authenticator
     * @param ServerRequestInterface $request
     * @return ApiLoginRequest|null
     * @throws ReflectionException
     */
    private function invokeParseApiLoginRequestData(
        Authenticator $authenticator,
        ServerRequestInterface $request
    ): ?ApiLoginRequest {
        $method = new ReflectionMethod(Authenticator::class, 'parseApiLoginRequestData');
        return $method->invoke($authenticator, $request);
    }

    /**
     * Sets a private property value on Authenticator for test setup.
     *
     * @param Authenticator $authenticator
     * @param string $propertyName
     * @param mixed $value
     * @return void
     * @throws ReflectionException
     */
    private function setProperty(Authenticator $authenticator, string $propertyName, mixed $value): void
    {
        $property = new ReflectionProperty(Authenticator::class, $propertyName);
        $property->setValue($authenticator, $value);
    }
}
