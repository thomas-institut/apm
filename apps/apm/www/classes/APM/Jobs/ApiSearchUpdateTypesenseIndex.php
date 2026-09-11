<?php

namespace APM\Jobs;

use Typesense\Client;

abstract class ApiSearchUpdateTypesenseIndex
{
    protected Client $client;

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}