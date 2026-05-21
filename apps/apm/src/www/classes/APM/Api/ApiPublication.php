<?php

namespace APM\Api;



use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\StandardApi\ApiResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;


class ApiPublication extends ApiController
{
    const array validIds = [12340001, 12340002, 12340003];

    public function list(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $apiResponse = new PublicationApiListResponse();
        $apiResponse->result = ApiResponse::ResultSuccess;
        $apiResponse->publications = self::validIds;

        return $this->responseFactory->success($response, $apiResponse);
    }

    public function get(Request $request, Response $response) : Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $requestedId = $request->getAttribute('id');
        if ($requestedId === null) {
            return $this->responseFactory->badRequest($response, 'No publication id provided');
        }
        $id = intval($requestedId);
        if ($id < 1000000) {
            return $this->responseFactory->badRequest($response, 'Invalid publication id provided');
        }

        if (!in_array($id, self::validIds)) {
            return $this->responseFactory->notFound($response, "Publication id $id not found");
        }

        $publicationData = [
            'id' => $id,
            'type' => 'test',
            'title' => 'Test Publication',
            'description' => 'Test Publication Description',
        ];
        $apiResponse = new PublicationApiGetResponse();
        $apiResponse->result = ApiResponse::ResultSuccess;
        $apiResponse->publicationData  = $publicationData;
        return $this->responseFactory->success($response, $apiResponse);
    }
}