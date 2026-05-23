<?php

use ThomasInstitut\Ape\Controllers\InfoController;
use ThomasInstitut\Ape\Controllers\PublicationController;

return [
    ['GET', '/api/info', [InfoController::class, 'getBackendInfo']],
    ['GET', '/api/publication/list', [PublicationController::class, 'list']],
    ['GET', '/api/publication/lastUpdate', [PublicationController::class, 'lastUpdate']],
    ['GET', '/api/publication/{id}/get', [PublicationController::class, 'get']],
];
