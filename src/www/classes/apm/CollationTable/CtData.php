<?php

namespace APM\CollationTable;

use APM\System\WitnessType;

class CtData
{

    public static function getMentionedDocsFromCtData(array $ctData) : array {
        $docs = [];
        foreach($ctData['witnesses'] as $witness) {
            if ($witness['witnessType'] === WitnessType::FULL_TRANSCRIPTION) {
                $docs[] = $witness['docId'];
            }
        }
        return $docs;
    }
}