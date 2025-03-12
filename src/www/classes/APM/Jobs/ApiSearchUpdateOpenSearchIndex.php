<?php

namespace APM\Jobs;

abstract class ApiSearchUpdateOpenSearchIndex
{

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}