<?php

namespace APM\MultiChunkEdition;

class MceSystemData
{
    public int $authorId;

    /** @var array<string>  */
    public array $chunks;
    public string $versionDescription;
    public string $validFrom;
    public string $validUntil;
    /** @var array<string, mixed> */
    public array $mceData;
}