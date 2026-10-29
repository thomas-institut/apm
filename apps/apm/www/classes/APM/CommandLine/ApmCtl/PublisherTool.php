<?php

namespace APM\CommandLine\ApmCtl;

use APM\CommandLine\MultiToolCli\MultiToolCliUtility;
use APM\System\Auth\PublisherTokenManager;
use InvalidArgumentException;
use Random\RandomException;

class PublisherTool implements MultiToolCliUtility
{
    private const string CMD = 'publisher';
    private const string USAGE = 'publisher token <publisherId> : creates and displays a Publisher bearer token';

    public function __construct(private readonly PublisherTokenManager $publisherTokenManager)
    {
    }

    /**
     * Returns the command name.
     *
     * @return string
     */
    public static function getName(): string
    {
        return self::CMD;
    }

    /**
     * Returns command usage instructions.
     *
     * @return string
     */
    public static function getUsage(): string
    {
        return self::USAGE;
    }

    /**
     * Returns the command description.
     *
     * @return string
     */
    public static function getDescription(): string
    {
        return 'Publisher authentication management';
    }

    /**
     * Generates a new token for a Publisher entity.
     *
     * @param int $argc
     * @param array $argv
     * @return int
     */
    public function run(int $argc, array $argv): int
    {
        if ($argc !== 3 || ($argv[1] ?? '') !== 'token' || (int)($argv[2] ?? 0) <= 0) {
            print self::USAGE . "\n";
            return 1;
        }

        try {
            $token = $this->publisherTokenManager->createToken((int)$argv[2]);
            print $token . "\n";
            return 0;
        } catch (InvalidArgumentException $e) {
            print 'Error: ' . $e->getMessage() . "\n";
            return 1;
        } catch (RandomException) {
            print "Error: could not generate a secure token\n";
            return 1;
        }
    }
}