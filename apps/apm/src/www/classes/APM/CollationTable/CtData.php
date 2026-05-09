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

    /**
     * Checks the consistency of a given CtData
     * Returns an array with a description of problems.
     * If the returned array does not have any elements, the given CtData is
     * consistent.
     * @param array $ctData
     * @return array
     */
    public static function checkCollationTableConsistency(array $ctData) : array {
        $problems = [];
        if (!isset($ctData['witnesses'])) {
           $problems[] = "No witnesses in collation table";
           return $problems;
        }

        $numWitnesses = count($ctData['witnesses']);
        $numCollationWitnesses = 0;
        for ($i = 0; $i< $numWitnesses; $i++) {
            if ($ctData['witnesses'][$i]['witnessType'] === 'fullTx' || $ctData['witnesses'][$i]['witnessType'] === 'edition') {
                $numCollationWitnesses++;
            }
        }

        if (!isset($ctData['collationMatrix'])) {
            $problems[] = "No collation table matrix  in data";
            return $problems;
        }

        if (count($ctData['collationMatrix']) !== $numCollationWitnesses) {
            $problems[] = "Invalid collation table matrix";
        }
        return $problems;
    }
}