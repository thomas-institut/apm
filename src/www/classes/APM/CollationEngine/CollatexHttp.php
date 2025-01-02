<?php

namespace APM\CollationEngine;



use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class CollatexHttp extends CollationEngine
{

    private string $host;
    private int $port;
    private Client $guzzleClient;

    const ERROR_GUZZLE_EXCEPTION = 2025;
    const ERROR_COULD_NOT_DECODE_JSON = 2026;
    const ERROR_COLLATEX_DID_NOT_RETURN_AN_ARRAY = 2027;

    public function __construct(string $host='127.0.0.1', int $port=7369)
    {
        parent::__construct('Collatex 1.7.1 (http)');
        $this->host = $host;
        $this->port = $port;
        $this->guzzleClient = new Client();
    }


    /**
     * @inheritDoc
     */
    public function collate(array $witnessArray): array
    {
        $this->reset();
        $this->startChrono();
        $input = json_encode([ 'witnesses' => $witnessArray]);
        try {
            $res = $this->guzzleClient->request('POST', $this->host . ':' . $this->port . '/collate', [
                'body' => $input,
                'headers' => ['Accept' => 'application/json',]
            ]);
        } catch (GuzzleException $e) {
            // error!
           $this->setError(self::ERROR_GUZZLE_EXCEPTION, $e->getMessage());
           return [];
        }
        $responseString= $res->getBody()->getContents();
        $output = json_decode($responseString, true);
        $this->endChrono();

        if ($output === null) {
            $this->logger->error("Could not decode response from Collatex", [ 'response' => $responseString ]);
            $this->setError(self::ERROR_COULD_NOT_DECODE_JSON);
            return [];
        }
        if (!is_array($output)) {
            $this->logger->error("Collatex response is not an array", [ 'response' => $responseString ]);
            $this->setError(self::ERROR_COLLATEX_DID_NOT_RETURN_AN_ARRAY);
            return [];
        }
        return $output;
    }
}