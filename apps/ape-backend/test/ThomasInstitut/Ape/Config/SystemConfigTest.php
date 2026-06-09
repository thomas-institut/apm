<?php

namespace ThomasInstitut\Ape\Config;

use CuyZ\Valinor\Mapper\MappingError;
use CuyZ\Valinor\MapperBuilder;
use PHPUnit\Framework\TestCase;

class SystemConfigTest extends TestCase
{
    private function map(array $data): SystemConfig
    {
        $data['general'] = $data;
        return (new MapperBuilder())
            ->allowSuperfluousKeys()
            ->mapper()
            ->map(SystemConfig::class, $data);
    }

    /**
     */
    public function testFromArray(): void
    {
        $data = [
            'devMode' => false,
            'subDir' => '/test',
            'log' => [
                'name' => 'TEST_LOG',
                'path' => '/tmp/test.log'
            ],
            'version' => [
                'title' => 'Test Version',
                'date' => '2024-05-11'
            ]
        ];

        $config = $this->map($data);
        $this->assertFalse($config->general->devMode);
        $this->assertEquals('/test', $config->general->subDir);

        $this->assertEquals('TEST_LOG', $config->log->name);
        $this->assertEquals('/tmp/test.log', $config->log->path);

        $this->assertEquals('Test Version', $config->version->title);
        $this->assertEquals('2024-05-11', $config->version->date);
    }

    /**
     */
    public function testDefaults(): void
    {
        $config = $this->map([
            'version' => [
                'title' => 'v1',
                'date' => 'today'
            ]
        ]);

        $defaultGeneral = new GeneralConfig();
        $this->assertEquals($defaultGeneral->devMode, $config->general->devMode);
        $this->assertEquals($defaultGeneral->subDir, $config->general->subDir);

        $defaultLog = new LogConfig();
        $this->assertEquals($defaultLog->name, $config->log->name);
        $this->assertEquals($defaultLog->path, $config->log->path);
    }

    /**
     */
    public function testRequiredVersionInfo(): void
    {
        // If 'version' key is present but empty, it should throw MappingError
        $this->expectException(MappingError::class);
        $this->map([
            'version' => []
        ]);
    }

    /**
     */
    public function testMissingVersionSection(): void
    {
        $this->expectException(MappingError::class);
        $this->map([]);
    }
}
