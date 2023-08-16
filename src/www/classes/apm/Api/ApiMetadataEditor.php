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

        $id = $_POST['id'];

        // $data = $this->getMetadataFromSql($id);

        $data = ['id' => $id,
            'type' => 'person',
            'currentMetadata' => ['Lukas', 190, '21-01-1992', 'luk.reichert@posteo.de', 'Student', 'männlich'],
            'metadataSchema' => [
                'Name' => 'string',
                'Größe' => 'number',
                'Geburtsdatum' => 'date',
                'E-Mail Adresse' => 'email',
                'Beruf' => 'string',
                'Geschlecht' => 'string'
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

        // $id = $this->getIdForNewEntityFromSql();
        $id = 115;

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