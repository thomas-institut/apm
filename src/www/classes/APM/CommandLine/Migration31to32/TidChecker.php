<?php

namespace APM\CommandLine\Migration31to32;

use ThomasInstitut\DataTable\DataTable;

class TidChecker
{


    /**
     * @param int $tid
     * @param DataTable[] $tablesToCheck
     * @return bool
     */
    public static function isTidInUse(int $tid, array $tablesToCheck) : bool {
        foreach($tablesToCheck as $dt) {
            $rows = $dt->findRows(['tid' => $tid]);
            if (count($rows) > 0) {
                return true;
            }
        }
        return false;
    }

}