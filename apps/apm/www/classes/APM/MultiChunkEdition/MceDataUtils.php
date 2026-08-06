<?php

namespace APM\MultiChunkEdition;

class MceDataUtils
{

    /**
     * Returns the chunk Ids present in the given MceData array
     * @param array $mceData
     * @return array
     */
    static public function getChunkIds(array $mceData): array {
        $chunkIds = [];
        foreach ($mceData['chunks'] as $chunk) {
            $chunkIds[] = $chunk['chunkId'];
        }
        return $chunkIds;
    }


}