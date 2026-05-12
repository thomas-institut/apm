<?php

use JetBrains\PhpStorm\NoReturn;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use Slim\Factory\AppFactory;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\Ape\Controllers\InfoController;
use ThomasInstitut\ConfigLoader\ConfigLoader;
use ThomasInstitut\Profiler\SystemProfiler;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;
use ThomasInstitut\StandardApi\RouteBuilder;


$apiDefinition = [
    ['GET', '/api/info', [InfoController::class, 'getServerInfo']]
];


// Load and start profiler right away
require __DIR__ . '/vendor/thomas-institut/shared-php/src/ThomasInstitut/Profiler/SystemProfiler.php';
SystemProfiler::start();

// Load the rest
require __DIR__ . '/vendor/autoload.php';

// Create the system config and logger
$systemConfig = loadConfig();
$logger = buildLogger($systemConfig);

// Create the DI container
$container = new DI\Container();
$container->set(SystemConfig::class, $systemConfig);
$container->set(LoggerInterface::class, $logger);

AppFactory::setContainer($container);
$app = AppFactory::create();
RouteBuilder::build($app, $apiDefinition);
$app->run();

function loadConfig(): SystemConfig
{
    $configArray = ConfigLoader::getConfigArray(['version.yaml'], ['config.yaml', '/etc/ti/ape-config.yaml']);

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

function buildLogger(SystemConfig $systemConfig): Logger
{
    $logger = new Logger($systemConfig->log->name);
    $logger->pushHandler(new StreamHandler($systemConfig->log->path));
    return $logger;
}

#[NoReturn]
function exitWithErrorMessage(string $msg): void
{
    http_response_code(500);
    header('Content-Type: text/plain');
    print "SERVER ERROR: $msg";
    exit();
}
