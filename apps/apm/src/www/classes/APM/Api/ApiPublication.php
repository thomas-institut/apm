<?php

namespace APM\Api;


use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;
use ThomasInstitut\ApmPublicationApi\ApmPublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;
use ThomasInstitut\StandardApi\ApiResponse;


class ApiPublication extends ApiController
{

    /**
     * @var array<ApmPublicationListing>|null
     */
    private ?array $mockPublications = null;

    /**
     * @throws MissingRequiredValueException
     * @throws WrongValueTypeException
     */
    public function list(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $apiResponse = new PublicationApiListResponse();
        $apiResponse->result = ApiResponse::ResultSuccess;
        $apiResponse->publications = $this->getMockUpPublicationListings();

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

        foreach ($this->getMockUpPublicationListings() as $publicationListing) {
            if ($publicationListing->id === $id) {
                $apiResponse = new PublicationApiGetResponse();
                $apiResponse->result = ApiResponse::ResultSuccess;
                $apiResponse->publicationData = get_object_vars($publicationListing);
                return $this->responseFactory->success($response, $apiResponse);
            }
        }
        return $this->responseFactory->notFound($response, "Publication $id not found");
    }


    private function getMockUpPublicationListings(): array
    {
        $data = [
            ['type' => 'test', 'id' => 82837192, 'versionTimeString' => '2026-01-20 15:23:20.123456', 'title' => 'Test Publication', 'description' => 'This is a test publication'],
            ['type' => 'test', 'id' => 63188123, 'versionTimeString' => '2026-01-20 15:23:20.123456', 'title' => 'Another Publication', 'description' => 'Another test publication'],
            ['type' => 'test', 'id' => 34234330, 'versionTimeString' => '2026-01-20 15:23:20.123456', 'title' => 'Yet Another Publication', 'description' => 'Yet another test publication']
        ];

        if ($this->mockPublications === null) {
            $pubListings = [];
            foreach ($data as $pub) {
                try {
                    $listing = new ApmPublicationListing();
                    $listing->fromArray($pub);
                    $pubListings[] = $listing;
                } catch (MissingRequiredValueException|WrongValueTypeException) {
                    throw new RuntimeException("Could not create publication listing from array");
                }
            }
            $this->mockPublications = $pubListings;
        }
        return $this->mockPublications;

    }
}