<?php

use JetBrains\PhpStorm\NoReturn;
use ThomasInstitut\Ape\Config\SystemConfig;
use ThomasInstitut\ConfigLoader\ConfigLoader;
use ThomasInstitut\Settable\MissingRequiredValueException;
use ThomasInstitut\Settable\WrongValueTypeException;

require __DIR__ . '/vendor/autoload.php';

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


print "APE is running. Version: {$systemConfig->version->title} ({$systemConfig->version->date})";

#[NoReturn]
function exitWithErrorMessage(string $msg): void
{
    http_response_code(500);
    header('Content-Type: text/plain');
    print "SERVER ERROR: $msg";
    exit();
}
