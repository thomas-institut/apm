<?php

namespace APM\Api;

use APM\Api\DataSchema\ApiMceSaveResponse;
use Exception;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiMultiChunkEdition extends ApiController
{


    const string CLASS_NAME = 'MultiChunkEditions';

    public function getEdition(Request $request, Response $response, array $args): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $editionId = intval($request->getAttribute('editionId'));
        $timeStamp = $request->getAttribute('timestamp',  TimeString::now());
        try {
            $data = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionById($editionId, $timeStamp);
        } catch (Exception) {
            // this should almost never happen!
            $this->logger->error("Edition $editionId not found");
            return $this->responseWithJson($response,  [
                'editionId' => $editionId,
                'message' => 'Edition not found'
            ], 404);
        }


        return $this->responseWithJson($response, $data);
    }

    public function saveEdition(Request $request, Response $response): Response
    {
        $inputJson = $request->getBody()->getContents();
        $inputData = json_decode($inputJson, true);

        $editionId = intval($inputData['editionId']);
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $editionId);
        $description = $inputData['description'];
        $mceData = $inputData['mceData'];
        $authorTid = $this->apiUserId;

        try {
            $editionId = $this->systemManager->getMultiChunkEditionManager()->saveMultiChunkEdition($editionId, $mceData, $authorTid, $description);
        } catch (Exception $e) {
            $this->logger->error("Error saving multi chunk edition", [
                'id' => $editionId,
                'author'=> $authorTid,
                'description' => $description,
                'msg' => $e->getMessage()
                ]);
            return $this->responseFactory->internalServerError($response, 'Error saving multi chunk edition');
        }
        // get the edition's data to report timestamp

        try {
            $data = $this->systemManager->getMultiChunkEditionManager()->getMultiChunkEditionById($editionId);
        } catch (Exception $e) {
            // this should almost never happen!
            $this->logger->error("Edition $editionId not found");
            return $this->responseFactory->notFound($response, 'Edition not found');
        }
        $mceSaveResponse = new ApiMceSaveResponse();
        $mceSaveResponse->id = $editionId;
        $mceSaveResponse->saveTimeStamp = $data['validFrom'];
        return $this->responseFactory->success($response, $mceSaveResponse);
    }
}