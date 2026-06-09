<?php

namespace ThomasInstitut\Ape\Controllers;

use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\Ape\ApiSchema\GetPublicationLastUpdateApiResponse;
use ThomasInstitut\Ape\Managers\PublicationManager;
use ThomasInstitut\Ape\Managers\PublicationNotFoundException;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;

class PublicationController extends ApiController
{

    public function list(Request $request, Response $response): Response {
        $this->setApiCallNameFromClassFunction(__CLASS__, __FUNCTION__);
        try {
            $publicationManager = $this->container->get(PublicationManager::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            return $this->responseFactory->internalServerError($response, 'PublicationManager not found');
        }
        $listings = $publicationManager->getPublicationListings();

        $apiResponse = new PublicationApiListResponse();
        $apiResponse->publications = $listings;
        return $this->responseFactory->success($response, $apiResponse);
    }

    public function get(Request $request, Response $response): Response {

        $idParam = $request->getAttribute('id');
        if ($idParam === null) {
            return $this->responseFactory->badRequest($response, 'No publication id given');
        }
        if (!is_numeric($idParam)) {
            return $this->responseFactory->badRequest($response, 'Invalid publication id');
        }
        $id = intval($idParam);
        $this->setApiCallNameFromClassFunction(__CLASS__, __FUNCTION__ . ':' . $id);
        try {
            $publicationManager = $this->container->get(PublicationManager::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            return $this->responseFactory->internalServerError($response, 'PublicationManager not found');
        }
        /** @var PublicationManager $publicationManager */
        try {
            $publication = $publicationManager->getPublicationData($id);
        } catch (PublicationNotFoundException) {
            return $this->responseFactory->notFound($response, "Publication $id not found");
        }

        $apiResponse = new PublicationApiGetResponse();
        $apiResponse->publicationData = $publication;
        return $this->responseFactory->success($response, $apiResponse);
    }

    public function lastUpdate(Request $request, Response $response): Response {
        $this->setApiCallNameFromClassFunction(__CLASS__, __FUNCTION__);
        try {
            $publicationManager = $this->container->get(PublicationManager::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface) {
            return $this->responseFactory->internalServerError($response, 'PublicationManager not found');
        }
        /** @var PublicationManager $publicationManager */
        $lastUpdate = $publicationManager->getLastUpdateTimestamp();
        $apiResponse = new GetPublicationLastUpdateApiResponse();
        $apiResponse->apmLastUpdate = $lastUpdate;

        return $this->responseFactory->success($response, $apiResponse);
    }
}