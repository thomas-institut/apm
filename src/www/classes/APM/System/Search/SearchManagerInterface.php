<?php

namespace APM\System\Search;

interface SearchManagerInterface
{
    public function indexTranscription(int $docId, int $pageNumber, int $seq, string $foliation, int $col, int $pageId, string $transcriberName, string $transcriptionText );

}