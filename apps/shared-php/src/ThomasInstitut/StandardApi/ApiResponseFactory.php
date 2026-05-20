<?php

namespace ThomasInstitut\StandardApi;

use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\Http\HttpStatus;
use ThomasInstitut\Profiler\SystemProfiler;

class ApiResponseFactory implements LoggerAwareInterface
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

    private function logSystemProfiler(string $endLapName): void
    {
        if (!SystemProfiler::isStarted()) {
            return;
        }
        SystemProfiler::lap($endLapName);
        $this->logger->debug(
            sprintf("API PROFILER %s Finished in %.3f ms", $this->apiCallName, SystemProfiler::getTotalTimeInMs()),
            SystemProfiler::getLaps());
    }

    /**
     * @param ResponseInterface $response
     * @param string $json
     * @param int $httpStatusCode
     * @return ResponseInterface
     * @deprecated use success() instead
     */
    public function responseWithRawJson(ResponseInterface $response, string $json, int $httpStatusCode): ResponseInterface
    {
        $this->logSystemProfiler("Response with JSON ready");
        return $this->psrResponseWithRawJson($response, $json, $httpStatusCode);
    }
    
    

    public function success(ResponseInterface $response, ApiResponse $apiResponse): ResponseInterface
    {
        $apiResponse->result = ApiResponse::ResultSuccess;
        $payload = json_encode($apiResponse);
        $this->logSystemProfiler("Response with JSON ready");
        return $this->psrResponseWithRawJson($response, $payload, HttpStatus::SUCCESS);
    }


    /**
     * @deprecated use success() instead
     */
    public function responseWithJson(ResponseInterface $response, mixed $data, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        return $this->psrResponseWithJson($response, $data, $httpStatusCode);
    }

    private function psrResponseWithJson(ResponseInterface $response, mixed $data, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $payload = json_encode($data);
        $this->logSystemProfiler("Response with JSON ready");
        return $this->psrResponseWithRawJson($response, $payload, $httpStatusCode);
    }
    
    private function psrResponseWithRawJson(ResponseInterface $response, string $json, int $httpStatusCode): ResponseInterface
    {
        $response->getBody()->write($json);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($httpStatusCode);
    }


    /**
     * @param ResponseInterface $response
     * @param string $text
     * @param int $httpStatusCode
     * @return ResponseInterface
     */
    public function responseWithText(ResponseInterface $response, string $text, int $httpStatusCode = HttpStatus::SUCCESS): ResponseInterface
    {
        $lapName = $text === '' ? 'Response ready' : 'Response with text ready';
        $this->logSystemProfiler($lapName);
        if ($text !== '') {
            $response->getBody()->write($text);
        }
        return $response->withStatus($httpStatusCode);
    }

    private function error(ResponseInterface $response, string $errorMsg, int $httpStatus): ResponseInterface
    {
        return $this->psrResponseWithJson($response, new ErrorResponse($errorMsg, $httpStatus), $httpStatus);
    }

    public function internalServerError(ResponseInterface $response, string $errorMsg = ''): ResponseInterface
    {
        $msg = $errorMsg === '' ? 'Internal server error' : 'Internal server error: ' . $errorMsg;
        return $this->error($response, $msg, HttpStatus::INTERNAL_SERVER_ERROR);
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

    public function notFound(ResponseInterface $response, string $errorMsg = ''): ResponseInterface
    {
        $msg = $errorMsg === '' ? 'Not found' : 'Not found: ' . $errorMsg;
        return $this->error($response, $msg, HttpStatus::NOT_FOUND);
    }
}