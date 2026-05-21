<?php

namespace ThomasInstitut\ApmPublicationApi;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;

class ClientTest extends TestCase
{
    public function testList(): void
    {
        $mock = new MockHandler([
            new Response(200, [], json_encode([
                'result' => 'Success',
                'timeStamp' => 123456789,
                'publications' => [1, 2, 3]
            ])),
        ]);

        $handlerStack = HandlerStack::create($mock);
        $guzzleClient = new GuzzleClient(['handler' => $handlerStack]);

        $client = new PublicationApiClient( $guzzleClient);
        $response = $client->list();

        $this->assertEquals('Success', $response->result);
        $this->assertEquals(123456789, $response->timeStamp);
        $this->assertEquals([1, 2, 3], $response->publications);
    }

    public function testGet(): void
    {
        $publicationData = [
            'id' => 123,
            'title' => 'Test Publication'
        ];

        $mock = new MockHandler([
            new Response(200, [], json_encode([
                'result' => 'Success',
                'timeStamp' => 123456789,
                'publicationData' => $publicationData
            ])),
        ]);

        $handlerStack = HandlerStack::create($mock);
        $guzzleClient = new GuzzleClient(['handler' => $handlerStack]);

        $client = new PublicationApiClient($guzzleClient);
        $response = $client->get(123);

        $this->assertEquals('Success', $response->result);
        $this->assertEquals(123456789, $response->timeStamp);
        $this->assertEquals($publicationData, $response->publicationData);
    }
}
