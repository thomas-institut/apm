<?php

namespace APM\MultiChunkEdition;

class MceData
{

    /**
     * Create an empty MceData associative array
     * @return array
     */
    static public function createEmpty() : array {
        return [
            'chunks' => [],
            'title' => '',
            'initialSpace' => '',
            'preamble' => [],
            'witnesses' => [],
            'sigla' => [],
            'siglaGroups' => [],
            'lang' => '',
            'stylesheetId' => '',
            'archived' => false,
            'schemaVersion' => '1.0'
        ];
    }

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