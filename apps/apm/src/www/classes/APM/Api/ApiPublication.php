<?php

namespace APM\Api;


use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use RuntimeException;

use ThomasInstitut\ApmPublicationApi\PublicationData;
use ThomasInstitut\ApmPublicationApi\PublicationListing;
use ThomasInstitut\ApmPublicationApi\PublicationApiGetResponse;
use ThomasInstitut\ApmPublicationApi\PublicationApiListResponse;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TextPublicationData;
use CuyZ\Valinor\MapperBuilder;
use CuyZ\Valinor\Mapper\MappingError;


class ApiPublication extends ApiController
{
    /**
     * @var PublicationData[]|null
     */
    private ?array $mockPublicationData = null;

    private ?array $mockPublicationListings = null;

    /**
     */
    public function list(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $apiResponse = new PublicationApiListResponse();
        $apiResponse->publications = $this->getMockPublicationListings();

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

        foreach ($this->getMockPublicationData() as $publicationData) {
            if ($publicationData->id === $id) {
                $apiResponse = new PublicationApiGetResponse();
                $apiResponse->publicationData = $publicationData;
                return $this->responseFactory->success($response, $apiResponse);
            }
        }
        return $this->responseFactory->notFound($response, "Publication $id not found");
    }

    private function getMockData() : array {
        return [
            [
                'type' => PublicationType::Text,
                'id' => 82837192,
                'versionTimeString' => '2026-01-20 15:23:20.123456',
                'title' => 'Test Publication',
                'description' => 'This is a test publication',
                'text' => 'This is a very nice publication with a lot of text.'
            ],
            [
                'type' =>  PublicationType::Text,
                'id' => 63188123,
                'versionTimeString' => '2026-01-20 15:23:20.123456',
                'title' => 'Another Publication',
                'description' => 'Another test publication',
                'text' => 'This is another publication with a lot of text.'
            ],
            [
                'type' =>  PublicationType::Text,
                'id' => 34234330,
                'versionTimeString' => '2026-01-20 15:23:20.123456',
                'title' => 'Yet Another Publication',
                'description' => 'Yet another test publication',
                'text' => 'This is yet another publication with a lot of text.'
            ]
        ];
    }


    /**
     * @return PublicationData[]
     */
    private function getMockPublicationData(): array
    {
        $data = $this->getMockData();

        if ($this->mockPublicationData === null) {
            $pubDataArray = [];
            $mapper = (new MapperBuilder())->allowSuperfluousKeys()->mapper();
            foreach ($data as $pubData) {
                try {
                    if ($pubData['type'] === PublicationType::Text) {
                        $pubDataArray[] = $mapper->map(TextPublicationData::class, $pubData);
                    }
                } catch (MappingError $e) {
                    throw new RuntimeException("Could not create publication data from array", 0, $e);
                }
            }
            $this->mockPublicationData = $pubDataArray;
        }
        return $this->mockPublicationData;
    }

    /**
     * @return PublicationListing[]
     */
    private function getMockPublicationListings(): array
    {
        $data = $this->getMockData();

        if ($this->mockPublicationListings === null) {
            $publicationListings = [];
            $mapper = (new MapperBuilder())->allowSuperfluousKeys()->mapper();
            foreach ($data as $pubData) {
                try {
                    if ($pubData['type'] === PublicationType::Text) {
                        $publicationListings[] = $mapper->map(PublicationListing::class, $pubData);
                    }
                } catch (MappingError $e) {
                    throw new RuntimeException("Could not create publication listings from array", 0, $e);
                }
            }
            $this->mockPublicationListings = $publicationListings;
        }
        return $this->mockPublicationListings;
    }
}