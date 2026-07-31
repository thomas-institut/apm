<?php

namespace APM\Api\DataSchema;

use ThomasInstitut\StandardApi\SuccessResponse;

/**
 * Data returned by the collationTable versionInfo API call
 */
class ApiCollationTableVersionInfo extends SuccessResponse
{
    public int $tableId;
    public string $type;
    public string $title;
    public string $timeFrom;
    public string $timeUntil;
    public bool $isLatestVersion;
    public bool $archived;

}