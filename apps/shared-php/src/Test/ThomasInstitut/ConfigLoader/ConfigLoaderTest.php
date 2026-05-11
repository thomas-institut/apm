<?php


namespace Test\ThomasInstitut\ConfigLoader;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\ConfigLoader\ConfigLoader;

/**
 * Unit tests for ConfigLoader
 */
class ConfigLoaderTest extends TestCase
{
    private array $tempFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
        $this->tempFiles = [];
    }

    private function createTempFile(string $content): string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'config_test_');
        file_put_contents($tempFile, $content);
        $this->tempFiles[] = $tempFile;
        return $tempFile;
    }

    /**
     * Tests the getUpdatedArray method for deep merging and copying.
     */
    public function testGetUpdatedArray(): void
    {
        $base = [
            'key1' => 'value1',
            'key2' => [
                'subkey1' => 'subvalue1',
                'subkey2' => 'subvalue2',
            ],
            'key3' => 123,
        ];

        $update = [
            'key1' => 'new_value1',
            'key2' => [
                'subkey1' => 'new_subvalue1',
                'subkey3' => 'new_subvalue3',
            ],
            'key4' => 'value4',
        ];

        $expected = [
            'key1' => 'new_value1',
            'key2' => [
                'subkey1' => 'new_subvalue1',
                'subkey2' => 'subvalue2',
                'subkey3' => 'new_subvalue3',
            ],
            'key3' => 123,
            'key4' => 'value4',
        ];

        $result = ConfigLoader::getUpdatedArray($base, $update);
        $this->assertEquals($expected, $result);
    }

    /**
     * Tests getUpdatedArray with an empty update to ensure a deep copy is made.
     */
    public function testGetUpdatedArrayDeepCopy(): void
    {
        $base = [
            'key' => [
                'subkey' => 'value',
            ],
        ];

        $result = ConfigLoader::getUpdatedArray($base, []);
        $this->assertEquals($base, $result);

        // Changing the result should not affect the base
        $result['key']['subkey'] = 'changed';
        $this->assertEquals('value', $base['key']['subkey']);
    }

    /**
     * Tests getUpdatedArray throws an exception when updating an array with a non-array.
     */
    public function testGetUpdatedArrayThrowsExceptionOnTypeMismatch(): void
    {
        $base = [
            'key' => [
                'subkey' => 'value',
            ],
        ];

        $update = [
            'key' => 'not_an_array',
        ];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Trying to update array :key with non array');
        ConfigLoader::getUpdatedArray($base, $update);
    }

    /**
     * Tests the fileGetContents method.
     */
    public function testFileGetContents(): void
    {
        $file1 = $this->createTempFile('content1');
        $file2 = $this->createTempFile('content2');
        $nonExistent = '/tmp/non_existent_' . uniqid();

        // Should find the first file
        $this->assertEquals('content1', ConfigLoader::fileGetContents([$file1, $file2]));

        // Should skip non-existent file and find the next one
        $this->assertEquals('content2', ConfigLoader::fileGetContents([$nonExistent, $file2]));

        // Should return null if no file found
        $this->assertNull(ConfigLoader::fileGetContents([$nonExistent]));
        $this->assertNull(ConfigLoader::fileGetContents([]));
    }

    /**
     * Tests getConfigArray with valid files.
     */
    public function testGetConfigArraySuccess(): void
    {
        $default1 = $this->createTempFile("app:\n  name: DefaultApp\n  version: 1.0");
        $default2 = $this->createTempFile("app:\n  version: 1.1\n  debug: false");
        $user = $this->createTempFile("app:\n  debug: true\n  new_key: value");

        $expected = [
            'app' => [
                'name' => 'DefaultApp',
                'version' => '1.1',
                'debug' => true,
                'new_key' => 'value',
            ],
        ];

        $result = ConfigLoader::getConfigArray([$default1, $default2], [$user]);
        $this->assertEquals($expected, $result);
    }

    /**
     * Tests getConfigArray when a default config file is missing.
     */
    public function testGetConfigArrayMissingDefaultFile(): void
    {
        $nonExistent = '/tmp/non_existent_' . uniqid();

        $result = ConfigLoader::getConfigArray([$nonExistent], []);
        $this->assertNull($result);
        $this->assertStringContainsString('Unable to open default config file', ConfigLoader::getErrorMessage());
    }

    /**
     * Tests getConfigArray when a default config file has invalid YAML.
     */
    public function testGetConfigArrayInvalidDefaultYaml(): void
    {
        $invalidYaml = $this->createTempFile("invalid: yaml: : :");

        $result = ConfigLoader::getConfigArray([$invalidYaml], []);
        $this->assertNull($result);
        $this->assertStringContainsString('Unable to parse default config file', ConfigLoader::getErrorMessage());
    }

    /**
     * Tests getConfigArray when the user config file is missing.
     */
    public function testGetConfigArrayMissingUserFile(): void
    {
        $default = $this->createTempFile("foo: bar");
        $nonExistent = '/tmp/non_existent_' . uniqid();

        $result = ConfigLoader::getConfigArray([$default], [$nonExistent]);
        $this->assertNull($result);
        $this->assertEquals('Config YAML file not found', ConfigLoader::getErrorMessage());
    }

    /**
     * Tests getConfigArray when the user config file has invalid YAML.
     */
    public function testGetConfigArrayInvalidUserYaml(): void
    {
        $default = $this->createTempFile("foo: bar");
        $invalidYaml = $this->createTempFile("invalid: yaml: : :");

        $result = ConfigLoader::getConfigArray([$default], [$invalidYaml]);
        $this->assertNull($result);
        $this->assertEquals('Unable to parse config file', ConfigLoader::getErrorMessage());
    }
}
