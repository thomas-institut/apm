<?php

namespace APM\System\Factories;

use APM\System\Config\ApmSystemConfig;
use Exception;
use Monolog\Handler\ErrorLogHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use Monolog\Processor\WebProcessor;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;

class LoggerFactory
{

    private static array $serverLoggerFields = [
        'method' => 'REQUEST_METHOD',
        'url' => 'REQUEST_URI',
        'ip' => 'REMOTE_ADDR',
        'referrer' => 'HTTP_REFERER',
    ];

    public static function create(ApmSystemConfig $config): Logger
    {
        $loggerLevel = Level::Info;
        if ($config->log->includeDebugInfo) {
            $loggerLevel = Level::Debug;
        }

        $logger = new Logger($config->log->appName);

        try {
            $logStream = new StreamHandler($config->log->fileName,
                $loggerLevel);
        } catch (Exception) { // @codeCoverageIgnore
            return $logger;  // @codeCoverageIgnore
        }
        $logger->pushHandler($logStream);

        if ($config->log->inPhpErrorHandler) {
            // Cannot set this in testing, so, let's ignore it
            $phpLog = new ErrorLogHandler(); // @codeCoverageIgnore
            $logger->pushHandler($phpLog); // @codeCoverageIgnore
        }

        $logger->pushProcessor(new WebProcessor(null, self::$serverLoggerFields));

        return $logger;
    }

    /**
     * @throws NotFoundExceptionInterface
     * @throws ContainerExceptionInterface
     */
    public static function createForCli(ContainerInterface $ci): Logger
    {

        $config = $ci->get(ApmSystemConfig::class);
        $loggerLevel = Level::Info;
        if ($config->log->includeDebugInfo) {
            $loggerLevel = Level::Debug;
        }
        $logger = new Logger($config->log->appName . '.CLI');
        try {
            $logStream = new StreamHandler($config->log->fileName,
                $loggerLevel);
        } catch (Exception) { // @codeCoverageIgnore
            return $logger;  // @codeCoverageIgnore
        }
        $logger->pushHandler($logStream);

        $processUser = $ci->get('processUserInfoArray');
        $cmd = $ci->get('cmd');
        $pid = $ci->get('pid');
        $logger->pushProcessor(
            function ($record) use ($processUser, $cmd, $pid) {
                $record['extra']['unixUser'] = $processUser['name'];
                $record['extra']['pid'] = $pid;
                $record['extra']['cmd'] = $cmd;
                return $record;
            });
        return $logger;
    }
}