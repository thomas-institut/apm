<?php

use ThomasInstitut\Ape\Controllers\InfoController;

return [
    ['GET', '/api/info', [InfoController::class, 'getBackendInfo']]
];
