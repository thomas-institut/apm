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
use ThomasInstitut\Profiler\SystemProfiler;
use ThomasInstitut\RouteBuilder\RouteBuilder;
use CuyZ\Valinor\Mapper\MappingError;

require_once __DIR__ . '/../vendor/autoload.php';

SystemProfiler::start();

require_once __DIR__ . '/loadConfig.php';
// Load the route definitions
$apiRoutesSpec = require __DIR__ . '/api-routes-spec.php';

if (!function_exists('buildLogger')) {
    function buildLogger(SystemConfig $systemConfig): Logger
    {
        $logger = new Logger($systemConfig->log->name);
        $logger->pushHandler(new StreamHandler($systemConfig->log->path));
        return $logger;
    }
}

if (!function_exists('exitWithErrorMessage')) {
    #[NoReturn] // @phpstan-ignore-line
    function exitWithErrorMessage(string $msg): void
    {
        http_response_code(500);
        header('Content-Type: text/plain');
        print "SERVER ERROR: $msg";
        exit();
    }

}

// Create the system config and logger
try {
    $systemConfig = loadConfig();
} catch (MappingError|RuntimeException $e) {
    exitWithErrorMessage($e->getMessage());
}
$logger = buildLogger($systemConfig);

// Create the DI container
$container = new DI\Container();
$container->set(SystemConfig::class, $systemConfig);
$container->set(LoggerInterface::class, $logger);
AppFactory::setContainer($container);

$app = AppFactory::create();
if ($systemConfig->general->subDir !== '') {
    $app->setBasePath('/' . $systemConfig->general->subDir);
}
RouteBuilder::build($app, $apiRoutesSpec);

//$routes = $app->getRouteCollector()->getRoutes();
//foreach ($routes as $route) {
//    $logger->debug("Route: {$route->getPattern()}");
//}

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



