<?php

namespace APM\NodeService;

class GenEditionPublicationInputData
{

    public int $editionId;
    public array $mceData;
    public string $versionString;
    public array $chunksCtData;

    public function __construct(int $editionId, array $mceData, string $versionString, array $chunksCtData) {
        $this->editionId = $editionId;
        $this->mceData = $mceData;
        $this->versionString = $versionString;
        $this->chunksCtData = $chunksCtData;
    }
}