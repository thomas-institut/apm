<?php

namespace APM\Api;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiMultiChunkEdition extends ApiController
{


    public function  getEdition(Request $request, Response $response, array $args): Response
    {

        $editionId = intval($request->getAttribute('editionId'));
        $timeStamp = $request->getAttribute('timestamp',  TimeString::now());
        try {
            $data = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionById($editionId, $timeStamp);
        } catch (\Exception $e) {
            // this should almost never happen!
            $this->logger->error("Edition $editionId not found");
            return $this->responseWithJson($response,  [
                'editionId' => $editionId,
                'message' => 'Edition not found'
            ], 404);
        }


        return $this->responseWithJson($response, $data);
    }

    public function saveEdition(Request $request, Response $response, array $args): Response
    {

        sleep(5);
        $apiCall = 'saveEdition';
        $requiredFields = [ 'editionId', 'mceData', 'description'];
        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }

        $editionId = intval($inputDataObject['editionId']);
        $description = $inputDataObject['description'];
        $mceData = $inputDataObject['mceData'];
        $authorId = $this->apiUserId;

        try {
            $editionId = $this->systemManager->getMultiChunkEditionManager()->saveMultiChunkEdition($editionId, $mceData, $authorId, $description);
        } catch (\Exception $e) {
            $this->logger->error("Error saving multi chunk edition", [
                'id' => $editionId,
                'author'=> $authorId,
                'description' => $description
                ]);
            return $this->responseWithJson($response,  [
                'status' => 'Error',
                'error' => 'Cannot save',
                'message' => $e->getMessage()
            ], 502);
        }
        // get the edition's data to report timestamp

        try {
            $data = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionById($editionId);
        } catch (\Exception $e) {
            // this should almost never happen!
            $this->logger->error("Edition $editionId not found");
            return $this->responseWithJson($response,  [
                'editionId' => $editionId,
                'message' => 'Edition not found'
            ], 404);
        }

        return $this->responseWithJson($response, [
            'status' => 'OK',
            'id' => $editionId,
            'saveTimeStamp' => $data['validFrom']
        ]);
    }
}