<?php

namespace APM\Api;

use APM\Api\DataSchema\ApiMceGetResponse;
use APM\Api\DataSchema\ApiMceGetVersionsResponse;
use APM\Api\DataSchema\ApiMceSaveResponse;
use APM\MultiChunkEdition\MultiChunkEditionDoesNotExist;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use Exception;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;

class ApiMultiChunkEdition extends ApiController
{


    const string CLASS_NAME = 'MultiChunkEditions';

    private MultiChunkEditionManager $mceManager;

    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);
        /** @var MultiChunkEditionManager $mceManager */
        $mceManager = $ci->get(MultiChunkEditionManager::class);
        $this->mceManager = $mceManager;
    }

    public function getEdition(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $editionId = intval($request->getAttribute('editionId'));$timeStamp = '';
        $compactEncodedTimeStamp =  $request->getAttribute('timestamp', '');
        if ($compactEncodedTimeStamp !== '') {
            $timeStamp = TimeString::compactDecode($compactEncodedTimeStamp);
        }
        if ($timeStamp === '') {
            $timeStamp = TimeString::now();
        }

        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ':' . $editionId . ':' . $timeStamp);

        try {
            $data = $this->mceManager->getMultiChunkEditionById($editionId, $timeStamp);
            $mceGetResponse = new ApiMceGetResponse();
            $mceGetResponse->validFrom = $data->validFrom;
            $mceGetResponse->validUntil = $data->validUntil;
            $mceGetResponse->chunks = $data->chunks;
            $mceGetResponse->versionDescription = $data->versionDescription;
            $mceGetResponse->mceData = $data->mceData;
            return $this->responseFactory->success($response, $mceGetResponse);
        } catch (MultiChunkEditionDoesNotExist) {
            $this->logger->error("Edition $editionId not found");
            return $this->responseFactory->notFound($response, "Edition $editionId not found");
        } catch (Exception $e) {
            $this->logger->error("Unexpected error while retrieving edition $editionId", [ 'exception' => $e]);
            return $this->responseFactory->internalServerError($response, "Unexpected error while retrieving edition $editionId");
        }
    }

    public function getEditionVersions(Request $request, Response $response) : Response {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $editionId = intval($request->getAttribute('editionId'));
        try {
            $versions = $this->mceManager->getEditionVersions($editionId);
            $apiResponse = new ApiMceGetVersionsResponse();
            $apiResponse->versions = $versions;
            return $this->responseFactory->success($response, $apiResponse);
        } catch (MultiChunkEditionDoesNotExist) {
            $this->logger->error("Edition $editionId not found");
            return $this->responseFactory->notFound($response, "Edition $editionId not found");
        } catch (Exception $e) {
            $this->logger->error("Unexpected error while retrieving edition $editionId", [ 'exception' => $e]);
            return $this->responseFactory->internalServerError($response, "Unexpected error while retrieving edition $editionId");
        }
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
            $editionId = $this->mceManager->saveMultiChunkEdition($editionId, $mceData, $authorTid, $description);
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
            $data = $this->mceManager->getMultiChunkEditionById($editionId);
            $mceSaveResponse = new ApiMceSaveResponse();
            $mceSaveResponse->id = $editionId;
            $mceSaveResponse->saveTimeStamp = $data->validFrom;
            return $this->responseFactory->success($response, $mceSaveResponse);
        } catch (Exception $e) {
            $this->logger->error("Unexpected error while retrieving edition $editionId after save", [ 'exception' => $e]);
            return $this->responseFactory->internalServerError($response, "Unexpected error while retrieving edition $editionId after save");
        }
    }
}