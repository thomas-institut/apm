<?php

namespace ThomasInstitut\ApmPublicationApi;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Exception\GuzzleException;
use ThomasInstitut\StandardApi\ApiResponse;
use ThomasInstitut\StandardApi\ErrorResponse;

readonly class PublicationApiClient
{

    public function __construct(private GuzzleClient $client)
    {
    }

    public function list(): PublicationApiListResponse | ErrorResponse
    {
        $url = 'list';
        try {
            $response = $this->client->get($url);
            $data = json_decode($response->getBody()->getContents(), true);

            if ($data['result'] === ApiResponse::ResultError) {
                $errorResponse = new  ErrorResponse($data['message']);
                $errorResponse->httpStatus = $data['httpStatus'] ?? 500;
                return $errorResponse;
            }
            $apiResponse = new PublicationApiListResponse();
            $apiResponse->result = $data['result'] ?? ApiResponse::ResultUndefined;
            $apiResponse->timeStamp = $data['timeStamp'] ?? -1;
            $apiResponse->publications = $data['publications'] ?? [];
            return $apiResponse;
        } catch (GuzzleException $e) {
            // TODO: add http status from exception
            return new ErrorResponse( "Guzzle error: " . $e->getMessage());
        }

    }


    public function get(int $id): PublicationApiGetResponse | ErrorResponse
    {
        $url =  "$id/get";
        try {
            $response = $this->client->get($url);
            $data = json_decode($response->getBody()->getContents(), true);

            $apiResponse = new PublicationApiGetResponse();
            $apiResponse->result = $data['result'] ?? ApiResponse::ResultUndefined;
            $apiResponse->timeStamp = $data['timeStamp'] ?? -1;
            $apiResponse->publicationData = $data['publicationData'] ?? [];

            return $apiResponse;
        } catch (GuzzleException $e) {
            // TODO: add http status from exception
            return new ErrorResponse( "Guzzle error: " . $e->getMessage());
        }
    }
}