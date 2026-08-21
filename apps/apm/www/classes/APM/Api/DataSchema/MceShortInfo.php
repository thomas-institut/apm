<?php

namespace APM\Api\DataSchema;

class MceShortInfo
{
    public function __construct(public int $id, public string $title)
    {
    }
}