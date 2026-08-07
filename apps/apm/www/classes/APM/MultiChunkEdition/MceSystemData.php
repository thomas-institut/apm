<?php

namespace APM\MultiChunkEdition;

class MceSystemData
{
    public int $authorId;
    /**
     * @var string[]
     */
    public array $chunks;
    public string $versionDescription;
    public string $validFrom;
    public string $validUntil;
    public array $mceData;
}