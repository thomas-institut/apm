<?php

namespace ThomasInstitut\Ape\Config;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;

class SystemConfigTest extends TestCase
{
    /**
     * @throws MissingRequiredValueException
     * @throws WrongValueTypeException
     */
    public function testFromArray(): void
    {
        $config = new SystemConfig();
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

        $config->fromArray($data);
        $this->assertFalse($config->general->devMode);
        $this->assertEquals('/test', $config->general->subDir);

        $this->assertEquals('TEST_LOG', $config->log->name);
        $this->assertEquals('/tmp/test.log', $config->log->path);

        $this->assertEquals('Test Version', $config->version->title);
        $this->assertEquals('2024-05-11', $config->version->date);
    }

    /**
     * @throws MissingRequiredValueException
     * @throws WrongValueTypeException
     */
    public function testDefaults(): void
    {
        $config = new SystemConfig();
        
        // We must provide version info because it's required if the key is present
        
        $config->fromArray([
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
     * @throws WrongValueTypeException
     */
    public function testRequiredVersionInfo(): void
    {
        $config = new SystemConfig();
        
        // If 'version' key is present but empty, it should throw MissingRequiredValueException
        $this->expectException(MissingRequiredValueException::class);
        $config->fromArray([
            'version' => []
        ]);
    }

    /**
     * @throws WrongValueTypeException
     */
    public function testMissingVersionSection(): void
    {
        $config = new SystemConfig();
        $this->expectException(MissingRequiredValueException::class);
        $config->fromArray([]);
    }
}
