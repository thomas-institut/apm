<?php

// This should return a json file as a API response

namespace APM\Api;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiMetadataEditor extends ApiController
{
    public function getMetadata(Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        $data = ['id' => 1,
            'type' => 'person',
            'currentMetadata' => [
                'attribute1' => 'Lukas',
                'attribute2' => 190,
                'attribute3' => '21-01-1992',
                'attribute4' => 'luk.reichert@posteo.de'
            ],
            'metadataSchema' => [
                'attribute1' => 'type string',
                'attribute2' => 'type number',
                'attribute3' => 'type date',
                'attribute4' => 'type emailAddress'
            ]
        ];

        // ApiResponse
        return $this->responseWithJson($response, [
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }
}