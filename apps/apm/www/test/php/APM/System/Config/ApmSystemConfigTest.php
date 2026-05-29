<?php

namespace APM\System\Config;

use CuyZ\Valinor\Mapper\MappingError;
use CuyZ\Valinor\MapperBuilder;
use PHPUnit\Framework\TestCase;

class ApmSystemConfigTest extends TestCase
{
    private function map(array $data): ApmSystemConfig
    {
        $data['general'] = $data;
        return (new MapperBuilder())
            ->allowSuperfluousKeys()
            ->mapper()
            ->map(ApmSystemConfig::class, $data);
    }

    public function testHydration(): void
    {
        $data = [
            'appName' => 'TEST_APP',
            'devMode' => true,
            'url' => [
                'collatexHttp' => 'http://test-collatex',
            ],
            'version' => [
                'version' => '1.0.0',
                'versionDate' => '2024-05-22',
                'jsAppCacheDataId' => 'xyz'
            ],
            'log' => [
                'fileName' => 'test.log'
            ]
        ];

        $config = $this->map($data);

        $this->assertEquals('TEST_APP', $config->general->appName);
        $this->assertTrue($config->general->devMode);
        $this->assertEquals('http://test-collatex', $config->url->collatexHttp);
        $this->assertEquals('1.0.0', $config->version->version);
        $this->assertEquals('2024-05-22', $config->version->versionDate);
        $this->assertEquals('xyz', $config->version->jsAppCacheDataId);
        $this->assertEquals('test.log', $config->log->fileName);
    }

    public function testDefaults(): void
    {
        $data = [
            'version' => [
                'version' => '1.0.0',
                'versionDate' => '2024-05-22',
                'jsAppCacheDataId' => 'xyz'
            ]
        ];

        $config = $this->map($data);

        $this->assertEquals('APM', $config->general->appName);
        $this->assertFalse($config->general->devMode);
        $this->assertEquals('http://localhost:7369', $config->url->collatexHttp);
        $this->assertEquals('', $config->log->fileName);
    }

    public function testMissingRequiredVersionInfo(): void
    {
        $this->expectException(MappingError::class);
        $this->map([
            'version' => [
                'version' => '1.0.0',
                // missing versionDate and jsAppCacheDataId
            ]
        ]);
    }

    public function testMissingVersionSection(): void
    {
        $this->expectException(MappingError::class);
        $this->map([]);
    }
}
