<?php

namespace APM\Api\DataSchema;

class WitnessUpdateData
{
    public string $status = 'undefined';
    public string $message = '';
    public string $timeStamp = '';
    /** @var WitnessUpdateInfo[] */
    public array $witnesses = [];
}