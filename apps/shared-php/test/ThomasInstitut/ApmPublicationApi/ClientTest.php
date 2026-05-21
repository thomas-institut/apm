<?php

namespace ThomasInstitut\ApmPublicationApi;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\StandardApi\ApiResponse;

class ClientTest extends TestCase
{
    public function testList(): void
    {
        $mock = new MockHandler([
            new Response(200, [], json_encode([
                'result' => ApiResponse::ResultSuccess,
                'timeStamp' => 123456789,
                'publications' => [
                    ['type' => 'test', 'id' => 1, 'versionTimeString' => '2026-01-20 15:23:20.123456', 'title' => 'Test Publication', 'description' => 'This is a test publication'],
                    ['type' => 'test','id' => 2, 'versionTimeString' => '2026-01-20 15:23:20.123456', 'title' => 'Another Publication', 'description' => 'Another test publication'],
                    ['type' => 'test','id' => 3, 'versionTimeString' => '2026-01-20 15:23:20.123456', 'title' => 'Yet Another Publication', 'description' => 'Yet another test publication']
                ]
            ])),
        ]);

        $handlerStack = HandlerStack::create($mock);
        $guzzleClient = new GuzzleClient(['handler' => $handlerStack]);

        $client = new PublicationApiClient($guzzleClient);
        $response = $client->list();

        $this->assertEquals(ApiResponse::ResultSuccess, $response->result, 'Unexpected result: ' . ($response->message ?? ''));
        $this->assertEquals(123456789, $response->timeStamp);
        foreach ($response->publications as $publication) {
            $this->assertInstanceOf(ApmPublicationListing::class, $publication, 'Unexpected publication type: ' . get_class($publication));
        }

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
