<?php

namespace APM\Api;

use APM\Api\DataSchema\ApiErrorResponse;
use APM\Api\DataSchema\ApiResponse;
use ThomasInstitut\Profiler\SystemProfiler;
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

//    public function withLogger(LoggerInterface $logger): self
//    {
//        $this->logger = $logger;
//        return $this;
//    }

    private function logSystemProfiler(string $endLapName): void
    {

        SystemProfiler::lap($endLapName);
        $this->logger->debug(
            sprintf("API PROFILER %s Finished in %.3f ms", $this->apiCallName, SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
    }

    public function responseWithRawJson(ResponseInterface $response, string $json, int $httpStatusCode): ResponseInterface
    {
        $this->logSystemProfiler("Response with JSON ready");
        $response->getBody()->write($json);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($httpStatusCode);
    }

    public function success(ResponseInterface $response, ApiResponse $apiResponse): ResponseInterface
    {
        if ($apiResponse->result !== ApiResponse::ResultSuccess) {
            $this->logger->error("Success response with wrong status: " . $apiResponse->result);
            return $this->internalServerError($response, "Handler returned wrong status: '" . $apiResponse->result . "'");
        }
        $payload = json_encode($apiResponse->withTimeStampNow());
        return $this->responseWithRawJson($response, $payload, HttpStatus::SUCCESS);
    }


    /**
     * @deprecated use success() instead
     */
    public function responseWithJson(ResponseInterface $response, mixed $data, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $payload = json_encode($data);
        return $this->responseWithRawJson($response, $payload, $httpStatusCode);
    }

    private function internalResponseWithJson(ResponseInterface $response, mixed $data, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $payload = json_encode($data);
        return $this->responseWithRawJson($response, $payload, $httpStatusCode);
    }


    public function responseWithText(ResponseInterface $response, string $text, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $lapName = $text === '' ? 'Response ready' : 'Response with text ready';
        $this->logSystemProfiler($lapName);
        if ($text !== '') {
            $response->getBody()->write($text);
        }
        return $response->withStatus($httpStatusCode);
    }

    private function error(ResponseInterface $response, string $errorMsg, int $httpStatus = HttpStatus::INTERNAL_SERVER_ERROR): ResponseInterface
    {
        return $this->internalResponseWithJson($response, (new ApiErrorResponse($errorMsg, $httpStatus))->withTimeStampNow(), $httpStatus);
    }

    public function internalServerError(ResponseInterface $response, string $errorMsg = ''): ResponseInterface
    {
        $msg = $errorMsg === '' ? 'Internal server error' : 'Internal server error: ' . $errorMsg;
        return $this->error($response, $msg);
    }

    public function unauthorized(ResponseInterface $response, string $errorMsg = ''): ResponseInterface
    {
        $msg = $errorMsg === '' ? 'Unauthorized' : 'Unauthorized: ' . $errorMsg;
        return $this->error($response, $msg, HttpStatus::UNAUTHORIZED);
    }

    public function badRequest(ResponseInterface $response, string $errorMsg = ''): ResponseInterface
    {
        $msg = $errorMsg === '' ? 'Bad request' : 'Bad request: ' . $errorMsg;
        return $this->error($response, $msg, HttpStatus::BAD_REQUEST);
    }

}