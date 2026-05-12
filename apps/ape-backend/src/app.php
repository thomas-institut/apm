<?php

use JetBrains\PhpStorm\NoReturn;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpException;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ConfigLoader\ConfigLoader;
use ThomasInstitut\Profiler\SystemProfiler;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;
use ThomasInstitut\StandardApi\RouteBuilder;

// Load and start profiler right away
require_once __DIR__ . '/../vendor/thomas-institut/shared-php/src/ThomasInstitut/Profiler/SystemProfiler.php';
SystemProfiler::start();

// Autoload dependencies
require_once __DIR__ . '/../vendor/autoload.php';

// Load the route definitions
$apiRoutesSpec = require __DIR__ . '/api-routes-definition.php';



if (!function_exists('loadConfig')) {
    function loadConfig(): SystemConfig
    {
        $baseDir = __DIR__ . '/..';
        $configArray = ConfigLoader::getConfigArray(
            [$baseDir . '/version.yaml'],
            [$baseDir . '/config.yaml', '/etc/ti/ape-config.yaml']
        );

        if ($configArray === null) {
            exitWithErrorMessage(ConfigLoader::getErrorMessage());
        }

        $systemConfig = new SystemConfig();
        try {
            $systemConfig->fromArray($configArray);
        } catch (MissingRequiredValueException|WrongValueTypeException $e) {
            exitWithErrorMessage($e->getMessage());
        }

        return $systemConfig;
    }

}

if (!function_exists('buildLogger')) {
    function buildLogger(SystemConfig $systemConfig): Logger
    {
        $logger = new Logger($systemConfig->log->name);
        $logger->pushHandler(new StreamHandler($systemConfig->log->path));
        return $logger;
    }

}

if (!function_exists('exitWithErrorMessage')) {
    #[NoReturn]
    function exitWithErrorMessage(string $msg): void
    {
        http_response_code(500);
        header('Content-Type: text/plain');
        print "SERVER ERROR: $msg";
        exit();
    }

}

// Create the system config and logger
$systemConfig = loadConfig();
$logger = buildLogger($systemConfig);

// Create the DI container
$container = new DI\Container();
$container->set(SystemConfig::class, $systemConfig);
$container->set(LoggerInterface::class, $logger);

AppFactory::setContainer($container);
$app = AppFactory::create();
RouteBuilder::build($app, $apiRoutesSpec);

$errorMiddleware = $app->addErrorMiddleware(false, true, true, $logger);
$errorMiddleware->setDefaultErrorHandler(function (
    ServerRequestInterface $request,
    Throwable $exception,
    bool $displayErrorDetails,
    bool $logErrors
) use ($app, $logger) {

    $statusCode = 500;
    $logMessage = 'Slim found an error';
    $errorType = 'other';
    $logTrace = false;
    $errorId = strtoupper(base_convert((string) time(), 10, 36));


    if ($exception instanceof HttpNotFoundException) {
        $errorType = 'notFound';
    } elseif ($exception instanceof HttpException) {
        $errorType = 'http';
    }

    switch ($errorType) {
        case 'notFound':
            $statusCode = 404;
            $logMessage = 'Endpoint not found';
            $logDetails  = [
                'path' => $request->getUri()->getPath(),
            ];
            break;

        case 'http':
            $logMessage = 'HTTP error';
            $statusCode = $exception->getCode();
            $logDetails = [
                'path' => $request->getUri()->getPath(),
                'status' => $statusCode,
            ];
            break;

        default:
            $logDetails = [
                'path' => $request->getUri()->getPath(),
                'exception' => get_class($exception),
                'msg' => $exception->getMessage(),
                'errorId' => $errorId
            ];
            $logTrace = true;
    }
    if ($logErrors) {
        $logger->error($logMessage, $logDetails);
        if ($logTrace) {
            foreach ($exception->getTrace() as $index => $trace) {
                $logger->debug(" - $errorId trace $index ", $trace);
            }
        }
    }
    return $app->getResponseFactory()->createResponse($statusCode);
});

return $app;



