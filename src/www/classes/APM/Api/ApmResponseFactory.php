<?php

namespace APM\Api;

use APM\SystemProfiler;
use APM\ToolBox\HttpStatus;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Factory for creating PSR-7 Response objects for the APM API
 *
 */
class ApmResponseFactory implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    private string $apiCallName = '';

    public function __construct(?LoggerInterface $logger = null)
    {
        $this->logger = $logger ?? new NullLogger();
    }

    public function withApiCallName(string $name): self
    {
        $this->apiCallName = $name;
        return $this;
    }

    public function withLogger(LoggerInterface $logger): self
    {
        $this->logger = $logger;
        return $this;
    }

    private function logProfilers(string $endLapName): void
    {
        SystemProfiler::lap($endLapName);
        $this->logger->debug(
            sprintf("API PROFILER %s Finished in %.3f ms", $this->apiCallName, SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
    }

    private function responseWithRawJson(ResponseInterface $response, string $json, int $httpStatusCode): ResponseInterface
    {
        $this->logProfilers("Response with JSON ready");
        $response->getBody()->write($json);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($httpStatusCode);
    }

    public function responseWithJson(ResponseInterface $response, mixed $data, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $payload = json_encode($data);
        return $this->responseWithRawJson($response, $payload, $httpStatusCode);
    }

    public function responseWithText(ResponseInterface $response, string $text, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $lapName = $text === '' ? 'Response ready' : 'Response with text ready';
        $this->logProfilers($lapName);
        if ($text !== '') {
            $response->getBody()->write($text);
        }
        return $response->withStatus($httpStatusCode);
    }
}