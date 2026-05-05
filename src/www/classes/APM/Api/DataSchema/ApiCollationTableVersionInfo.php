<?php

namespace APM\Api\DataSchema;

/**
 * Data returned by the collationTable versionInfo API call
 */
class ApiCollationTableVersionInfo
{
    public int $tableId;
    public string $type;
    public string $title;
    public string $timeFrom;
    public string $timeUntil;
    public bool $isLatestVersion;
    public bool $archived;

}