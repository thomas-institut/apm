<?php

namespace APM\NodeService;

use APM\ToolBox\HttpStatus;
use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class NodeServiceClient
{
    const int MIN_VALID_PDF_FILE_SIZE = 1000;

    private ?Client $client = null;

    public function __construct(private readonly string $url, private readonly int $timeOut = 45)
    {

    }


    /**
     * @throws NodeServiceFailedException
     * @throws CouldNotContactServiceException
     */
    public function generateEditionPublication(GenEditionPublicationInputData $inputData) : array {
        $client = $this->getGuzzleClient();
        try {
            $nodeServiceResponse = $client->post('/api/edition/publication/fromMceData', ['body' => json_encode($inputData)]);
        } catch (GuzzleException $e) {
            throw new CouldNotContactServiceException("Could not contact node service: " . $e->getMessage());
        } catch (Exception $e) {
            throw new NodeServiceFailedException("Unexpected error contacting node service: " . $e->getMessage());
        }

        if ($nodeServiceResponse->getStatusCode() !== HttpStatus::SUCCESS) {
            throw new NodeServiceFailedException("Node service failed with code " . $nodeServiceResponse->getStatusCode());
        }

        return json_decode($nodeServiceResponse->getBody()->getContents(), true);
    }

    /**
     * @throws NodeServiceFailedException
     * @throws CouldNotContactServiceException
     * @throws InvalidNodeServiceResponseException
     */
    public function generatePdf(array $inputData) : string {
        $client = $this->getGuzzleClient();
        try {
            $nodeService = $client->post('/api/typeset', ['body' => json_encode($inputData)]);
        } catch (GuzzleException $e) {
            throw new CouldNotContactServiceException("Could not contact node service: " . $e->getMessage());
        }

        if ($nodeService->getStatusCode() !== HttpStatus::SUCCESS) {
            throw new NodeServiceFailedException("Node service failed with code " . $nodeService->getStatusCode());
        }
        $pdfString =  $nodeService->getBody()->getContents();

        if (strlen($pdfString) < self::MIN_VALID_PDF_FILE_SIZE) {
            throw new InvalidNodeServiceResponseException("Node service returned empty or very small PDF");
        }
        return $pdfString;
    }

    private function getGuzzleClient(): Client
    {
        if ($this->client === null) {
            $this->client =  new Client([
                'base_uri' => $this->url,
                'timeout'  => $this->timeOut,
                'headers' => [ 'Content-Type' => 'application/json' ]
            ]);
        }
        return $this->client;
    }

}