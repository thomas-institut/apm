<?php

namespace APM\Api;


use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\PublicationManager\PublicationNotFoundException;


class ApiPublication extends ApiController
{
    private PublicationManagerInterface $publicationManager;

    public function __construct(ContainerInterface $ci)
    {
        parent::__construct($ci);
        $this->publicationManager = $ci->get(PublicationManagerInterface::class);
    }

    /**
     */
    public function list(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $apiResponse = new PublicationApiListResponse();
        $apiResponse->publications = $this->publicationManager->list();

        return $this->responseFactory->success($response, $apiResponse);
    }

    public function get(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);

        $requestedId = $request->getAttribute('id');
        if ($requestedId === null) {
            return $this->responseFactory->badRequest($response, 'No publication id provided');
        }
        $id = intval($requestedId);

        try {
            $apiResponse = new PublicationApiGetResponse();
            $apiResponse->publicationData = $this->publicationManager->getPublication($id);
            return $this->responseFactory->success($response, $apiResponse);
        } catch (PublicationNotFoundException) {
            return $this->responseFactory->notFound($response, "Publication $id not found");
        }
    }

}