<?php

namespace APM\Api\ResponseData;

class WitnessUpdateData
{
    public string $status = 'undefined';
    public string $message = '';
    public string $timeStamp = '';
    /** @var WitnessUpdateInfo[] */
    public array $witnesses = [];
}