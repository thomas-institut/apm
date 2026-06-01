<?php

namespace APM\NodeService;

use APM\ToolBox\HttpStatus;
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
     * @throws InvalidNodeServiceResponseException
     */
    public function generatePdf(array $inputData) : string {
        $client = $this->getGuzzleClient();
        try {
            $typesettingServiceResponse = $client->post('/api/typeset', ['body' => json_encode($inputData)]);
        } catch (GuzzleException $e) {
            throw new CouldNotContactServiceException("Could not contact node service: " . $e->getMessage());
        }

        if ($typesettingServiceResponse->getStatusCode() !== HttpStatus::SUCCESS) {
            throw new NodeServiceFailedException("Node service failed with code " . $typesettingServiceResponse->getStatusCode());
        }
        $pdfString =  $typesettingServiceResponse->getBody()->getContents();

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