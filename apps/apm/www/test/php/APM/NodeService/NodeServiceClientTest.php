<?php

namespace APM\NodeService;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class NodeServiceClientTest extends TestCase
{
    /**
     * Build a NodeServiceClient with an injected (mocked) Guzzle client.
     *
     * @param Response[]|\Throwable[] $responses
     */
    private function makeClient(array $responses, ?array &$historyContainer = null): NodeServiceClient
    {
        $mock = new MockHandler($responses);
        $stack = HandlerStack::create($mock);

        if ($historyContainer !== null) {
            $history = \GuzzleHttp\Middleware::history($historyContainer);
            $stack->push($history);
        }

        $guzzle = new Client([
            'handler' => $stack,
            'base_uri' => 'http://node-service.test',
            'headers' => ['Content-Type' => 'application/json'],
            // The production NodeServiceClient does not enable Guzzle's
            // http_errors behaviour either (it inspects the status code
            // manually), so disable it here for accurate emulation.
            'http_errors' => false,
        ]);

        $nsClient = new NodeServiceClient('http://node-service.test');

        // Inject the mocked Guzzle client into the private $client property.
        $ref = new ReflectionClass($nsClient);
        $prop = $ref->getProperty('client');
        $prop->setValue($nsClient, $guzzle);

        return $nsClient;
    }

    public function testGeneratePdfReturnsPdfStringOnSuccess(): void
    {
        $pdf = str_repeat('A', NodeServiceClient::MIN_VALID_PDF_FILE_SIZE + 10);
        $history = [];
        $client = $this->makeClient([new Response(200, [], $pdf)], $history);

        $inputData = ['foo' => 'bar', 'list' => [1, 2, 3]];
        $result = $client->generatePdf($inputData);

        $this->assertSame($pdf, $result);

        // Verify the request was issued correctly.
        $this->assertCount(1, $history);
        /** @var Request $request */
        $request = $history[0]['request'];
        $this->assertSame('POST', $request->getMethod());
        $this->assertSame('/api/typeset', $request->getUri()->getPath());
        $this->assertSame(json_encode($inputData), (string)$request->getBody());
    }

    public function testGeneratePdfThrowsCouldNotContactServiceOnGuzzleException(): void
    {
        $client = $this->makeClient([
            new ConnectException('connection refused', new Request('POST', '/api/typeset')),
        ]);

        $this->expectException(CouldNotContactServiceException::class);
        $this->expectExceptionMessage('Could not contact node service');

        $client->generatePdf(['x' => 1]);
    }

    public function testGeneratePdfThrowsNodeServiceFailedOnNonSuccessStatus(): void
    {
        $client = $this->makeClient([new Response(500, [], 'internal error')]);

        $this->expectException(NodeServiceFailedException::class);
        $this->expectExceptionMessage('500');

        $client->generatePdf(['x' => 1]);
    }

    public function testGeneratePdfThrowsInvalidResponseWhenBodyTooSmall(): void
    {
        $tooSmall = str_repeat('x', NodeServiceClient::MIN_VALID_PDF_FILE_SIZE - 1);
        $client = $this->makeClient([new Response(200, [], $tooSmall)]);

        $this->expectException(InvalidNodeServiceResponseException::class);

        $client->generatePdf(['x' => 1]);
    }

    public function testGeneratePdfAcceptsBodyAtExactMinimumSize(): void
    {
        $atMin = str_repeat('y', NodeServiceClient::MIN_VALID_PDF_FILE_SIZE);
        $client = $this->makeClient([new Response(200, [], $atMin)]);

        $result = $client->generatePdf([]);
        $this->assertSame($atMin, $result);
        $this->assertSame(NodeServiceClient::MIN_VALID_PDF_FILE_SIZE, strlen($result));
    }

    public function testGeneratePdfThrowsInvalidResponseOnEmptyBodyWithSuccessStatus(): void
    {
        $client = $this->makeClient([new Response(200, [], '')]);

        $this->expectException(InvalidNodeServiceResponseException::class);

        $client->generatePdf(['x' => 1]);
    }

    public function testConstructorStoresUrlAndTimeoutForLazyClientCreation(): void
    {
        // When no client is injected, getGuzzleClient() builds one using the
        // configured url and timeout. We verify those values are honored.
        $nsClient = new NodeServiceClient('http://example.test:9999', 17);

        $ref = new ReflectionClass($nsClient);

        $urlProp = $ref->getProperty('url');
        $this->assertSame('http://example.test:9999', $urlProp->getValue($nsClient));

        $timeoutProp = $ref->getProperty('timeOut');
        $this->assertSame(17, $timeoutProp->getValue($nsClient));

        // Invoke the private getGuzzleClient and inspect the resulting config.
        $method = $ref->getMethod('getGuzzleClient');
        /** @var Client $guzzle */
        $guzzle = $method->invoke($nsClient);

        $this->assertInstanceOf(Client::class, $guzzle);
        $this->assertSame('http://example.test:9999', (string)$guzzle->getConfig('base_uri'));
        $this->assertSame(17, $guzzle->getConfig('timeout'));
        $headers = $guzzle->getConfig('headers');
        $this->assertSame('application/json', $headers['Content-Type']);

        // Second call returns the same cached client instance.
        $guzzle2 = $method->invoke($nsClient);
        $this->assertSame($guzzle, $guzzle2);
    }
}
