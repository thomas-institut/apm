<?php

// This should return a json file as a API response

namespace APM\Api;

use PHPUnit\Util\Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;

class ApiMetadataEditor extends ApiController
{
    public function getMetadata(Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        $id = $_POST['id'];

        // $data = $this->getMetadataFromSql($id);

        $data = ['id' => $id,
            'type' => 'Testtype',
            'currentMetadata' => ['Test', 19, '20-07-1982', 'test@mail.com'],
            'metadataSchema' => [
                'Attribute 1' => 'string',
                'Attribute 2' => 'number',
                'Attribute 3' => 'date',
                'Attribute 4' => 'email',
            ]
        ];

        // ApiResponse
        return $this->responseWithJson($response, [
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    public function getSchemesForEntityTypes(Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        // POSSIBLE TYPES OF ENTITIES CAN EITHER BE HARD-CODED HERE OR ABSTRACTED FROM DATA STORED IN A SQL TABLE
        // $data = $this->getTypeSchemesFromSql();

        $data = [
            'Type 1' => [
                'Attribute 1' => 'string',
                'Attribute 2' => 'number',
                'Attribute 3' => 'date',
                'Attribute 4' => 'email',
            ],
            'Type 2' => [
                'Attribute 1' => 'string',
                'Attribute 2' => 'number',
            ],
            'Type 3' => [
                'Attribute 1' => 'string',
                'Attribute 2' => 'number',
                'Attribute 3' => 'number',
            ]
        ];

        // ApiResponse
        return $this->responseWithJson($response, [
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    public function saveMetadata(Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        $id = $_POST['id'];
        $type = $_POST['type'];
        $values = $_POST['values'];

        // $this->saveMetadataInSql($id, $type, $values);

        // ApiResponse
        return $this->responseWithJson($response, [
            'status' => $status,
            'now' => $now,
            'id' => $id,
            'type' => $type,
            'values' => $values
        ]);
    }

    public function createEntity (Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        $id = $_POST['id'];
        $type = $_POST['type'];
        $values = $_POST['values'];

        // $this->createEntityInSql($id, $type, $values);

        // ApiResponse
        return $this->responseWithJson($response, [
            'status' => $status,
            'now' => $now,
            'id' => $id,
            'type' => $type,
            'values' => $values
        ]);
    }

    public function getIdForNewEntity (Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        $cache = $this->systemManager->getSystemDataCache();
        $cacheKey = 'Next_Entity_ID';

        try { // Check for cached id

            $id = unserialize($cache->get($cacheKey));

        } catch (KeyNotInCacheException $e) { // Get id from sql database and set cache

            // $id = $this->getIdForNewEntityFromSql();
            $id = 0;

        }

        // Set cache
        $cache->set($cacheKey, serialize($id+1));

        // ApiResponse
        return $this->responseWithJson($response, [
            'status' => $status,
            'now' => $now,
            'id' => $id,
        ]);
    }

    private function getMetadataFromSql(int $id): array {

        $data = [];

        // TO DO | PLACE HERE A FUNCTION WHICH GETS DATA BY ID FROM A SQL TABLE

        return $data;
    }
    private function saveMetadataInSql(int $id, string $type, array $values): bool {

        // TO DO | PLACE HERE A FUNCTION WHICH WRITES THE DATA GIVEN AS ARGUMENTS INTO A SQL TABLE


        return true;
    }

    private function createEntityInSql(int $id, string $type, array $values): bool {

        // TO DO | PLACE HERE A FUNCTION WHICH CREATES AN ENTITY WITH ITS METADATA IN A SQL TABLE


        return true;
    }

    private function getIdForNewEntityFromSql(): bool {

        // TO DO | PLACE HERE A FUNCTION WHICH GETS THE HIGHEST ID IN A SQL TABLE AND RETURNS ID+1


        return true;
    }
}