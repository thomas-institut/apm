<?php

use ThomasInstitut\Ape\Controllers\AppConfigController;
use ThomasInstitut\Ape\Controllers\PublicationController;

return [
    ['GET', '/api/app/config', [AppConfigController::class, 'get']],
    ['GET', '/api/publication/list', [PublicationController::class, 'list']],
    ['GET', '/api/publication/lastUpdate', [PublicationController::class, 'lastUpdate']],
    ['GET', '/api/publication/{id}/get', [PublicationController::class, 'get']],
];
