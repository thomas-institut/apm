<?php

// This should return a json file as an API response

namespace APM\Api;

use PHPUnit\Util\Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;

class ApiPeopleManager extends ApiController
{
    public function getData(Request $request, Response $response): Response
    {

        $status = 'OK';
        $now = TimeString::now();
        $id = $_POST['id'];

        $data = $this->getMetadataFromSql($id);

        if ($data === []) {
            $status = 'Error in Cache!';
        }

        // ApiResponse
        return $this->responseWithJson($response, [
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }


    public function saveData(Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        $data = [
            'id' => $_POST['id'],
            'type' => $_POST['type'],
            'keys' => $_POST['keys'],
            'types' => $_POST['types'],
            'values' => $_POST['values']
        ];

        $this->saveMetadataInSql($data);

        // ApiResponse
        return $this->responseWithJson($response, [
            'status' => $status,
            'now' => $now,
            'data' => $data,
        ]);
    }

    public function getPersonSchema(Request $request, Response $response): Response
    {
        $status = 'OK';
        $now = TimeString::now();

        // POSSIBLE TYPES OF ENTITIES CAN EITHER BE HARD-CODED HERE OR ABSTRACTED FROM DATA STORED IN A SQL TABLE

        $id = $this->getIdForNewPerson();
            
        $data = [
            'id' => $id,
            'type' => 'person',
            'keys' => ['Display Name', 'Date of Birth', 'Place of Birth', 'Date of Death', 'Place of Death', 'URL'],
            'types' => ['text', 'date', 'text', 'date', 'text', 'url']
        ];

        // ApiResponse
        return $this->responseWithJson($response, [
            'data' => $data,
            'serverTime' => $now,
            'status' => $status]);
    }

    private function getIdForNewPerson (): string {
       
        $cache = $this->systemManager->getSystemDataCache();
        $cacheKey = 'Next_Entity_ID';

        try { // Check for cached id

            $id = unserialize($cache->get($cacheKey));

        } catch (KeyNotInCacheException $e) { // Get id from sql database and set cache

            // $id = $this->getIdForNewPersonFromSql();
            $id = 0;

        }

        // Set cache
        $cache->set($cacheKey, serialize($id+1));

        // ApiResponse
        return strval($id);
    }

    private function getMetadataFromSql(string $id): array {

        // TO DO | PLACE HERE A FUNCTION WHICH GETS DATA BY ID FROM A SQL TABLE

        $cache = $this->systemManager->getSystemDataCache();
        $cacheKey = 'person' . $id;
        try {
            $data = unserialize($cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            $data = [
                'id' => $id,
                'type' => 'person',
                'keys' => ['Display Name', 'Date of Birth', 'Place of Birth', 'Date of Death', 'Place of Death', 'URL'],
                'types' => ['text', 'date', 'text', 'date', 'text', 'url'],
                'values' => ['Hans', '1992-01-21', 'Karlsruhe', '1982-07-22', 'Toronto', 'www.wikipedia.com']
            ];
        }

        return $data;
    }

    private function saveMetadataInSql(array $data): bool {

        // TO DO | PLACE HERE A FUNCTION WHICH WRITES THE DATA GIVEN AS ARGUMENTS INTO A SQL TABLE

        $cache = $this->systemManager->getSystemDataCache();
        $cacheKey = 'person' . $data['id'];
        $cache->set($cacheKey, serialize($data));

        return true;
    }

    private function getIdForNewPersonFromSql(): bool {

        // TO DO | PLACE HERE A FUNCTION WHICH GETS THE HIGHEST ID IN A SQL TABLE AND RETURNS ID+1


        return true;
    }
}