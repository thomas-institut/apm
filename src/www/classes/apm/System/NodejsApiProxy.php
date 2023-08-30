<?php

namespace APM\System;

use APM\HttpProxy\HttpProxyInterface;
use APM\ToolBox\BaseUrlDetector;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;

class NodejsApiProxy implements HttpProxyInterface, LoggerAwareInterface
{
    use LoggerAwareTrait;

    const  NODEJS_SERVER_BASE_URL = 'http://localhost:3000';

    /**
     * @inheritDoc
     */
    public function proxy(string $cmd, Request $request, Response $response): Response
    {

        $newUri = self::NODEJS_SERVER_BASE_URL . $cmd;
        $this->logger->debug("Sending request for $newUri");

        $client = new Client([ 'http_errors' => true]);
        try {
            $result =  $client->get($newUri);
        } catch (RequestException $e) {
            if ($e->hasResponse()) {
                return $e->getResponse();
            }
            return $response->withStatus(500);
        }
        catch (GuzzleException $e) {
            return $response->withStatus(502);
        }
       return $this->responseFromGuzzleResult($response, $result);
    }

    private function responseFromGuzzleResult(Response $response, $result): Response {
        foreach ($result->getHeaders() as $name => $values) {
            $response = $response->withHeader($name, implode(', ', $values));
        }
        return $response->withStatus($result->getStatusCode())
            ->withBody($result->getBody());
    }
}