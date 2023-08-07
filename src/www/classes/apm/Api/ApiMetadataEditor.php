<?php

// This should return a json file as a API response

namespace APM\Api;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiMetadataEditor extends ApiController
{

    public function getMetadata(Request $request, Response $response): Response
    {

        $status = 'OK';
        $now = TimeString::now();

        $data = ['id' => 0,
            'type' => 'person',
            'currentMetaData' => [
                'attribute1' => '...',
                'attribute2' => '...',
                'attribute3' => '...',
                'attribute4' => '...'
            ],
            'metaDataSchema' => [
                'attribute1' => 'type string',
                'attribute2' => 'type number',
                'attribute3' => 'type date',
                'attribute4' => 'type emailAdress'
            ]
        ];

        // ApiResponse
        return $this->responseWithJson($response, [
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }
}