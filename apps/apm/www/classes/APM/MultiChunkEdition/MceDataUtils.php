<?php

namespace APM\MultiChunkEdition;

class MceDataUtils
{

    /**
     * Returns the chunk Ids present in the given MceData array
     * @param array<string, mixed> $mceData
     * @return array<int|string>
     */
    static public function getChunkIds(array $mceData): array {
        $chunkIds = [];
        foreach ($mceData['chunks'] as $chunk) {
            $chunkIds[] = $chunk['chunkId'];
        }
        return $chunkIds;
    }


}