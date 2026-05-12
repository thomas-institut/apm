<?php

namespace ThomasInstitut\Ape {

    use PHPUnit\Framework\TestCase;
    use Slim\Psr7\Factory\ServerRequestFactory;

    class ApiIntegrationTest extends TestCase
    {
        private $app;
        private $apiDefinition;

        protected function setUp(): void
        {
            // Adjust the path to reach src/app.php from test/ThomasInstitut/Ape/
            $this->app = require __DIR__ . '/../../../src/app.php';
            $this->apiDefinition = require __DIR__ . '/../../../src/api-routes-definition.php';
        }

        public function testApiEndpoints()
        {
            $factory = new ServerRequestFactory();

            foreach ($this->apiDefinition as $entry) {
                [$method, $path] = $entry;

                $request = $factory->createServerRequest($method, $path);
                $response = $this->app->handle($request);

                $this->assertNotEquals(404, $response->getStatusCode(), "Endpoint $path returned 404");
                $this->assertNotEquals(500, $response->getStatusCode(), "Endpoint $path returned 500");
            }
        }

        public function testNonExistentPaths()
        {
            $factory = new ServerRequestFactory();
            $request = $factory->createServerRequest('GET', '/api/non-existent-path');
            $response = $this->app->handle($request);

            $this->assertEquals(404, $response->getStatusCode());
            $this->assertEmpty((string)$response->getBody());
        }
    }
}
