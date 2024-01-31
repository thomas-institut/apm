<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace APM\CommandLine;

use APM\System\ApmMySqlTableName;
use \PDO;

/**
 * Check element sequences in the database looking for duplicate
 * and missing sequence numbers.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CheckElementSequence extends CommandLineUtility {
     const USAGE = "usage: checkelementsequence [fix]\n";
    
    public function main($argc, $argv)
    {
        
        $te = $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_ELEMENTS];
        
        $doFix = false;
        
        if (isset($argv[1]) and $argv[1]==='fix') {
            $doFix = true;
        }
        
        // get the list of defined page_id/column  pairs
        
        $query = "SELECT page_id, column_number, count(*) from $te where valid_until='9999-12-31 23:59:59.999999' GROUP BY page_id,column_number";
        
        $r = $this->getDbConn()->query($query);
        
        $cols = [];
        while ($row = $r->fetch(PDO::FETCH_ASSOC)){
            $cols[] = $row;
        }
        
        print "There are " . count($cols) . " columns with elements in the system\n";
        if (!$doFix) {
            print "(!) Checking only, use 'fix' to attempt fixing the problems\n";
        }
        
        $allGood = true;
        
        for($i=0; $i<count($cols); $i++) {
            
            $query2 = "SELECT seq, id from $te where page_id=" . $cols[$i]['page_id'] .
                " AND column_number=" . $cols[$i]['column_number'] . 
                " AND valid_until='9999-12-31 23:59:59.999999' ORDER BY seq ASC";
            
            $r2 = $this->getDbConn()->query($query2);
            
            $rows = [];
            while ($row = $r2->fetch(PDO::FETCH_ASSOC)){
                $rows[] = $row;
            }
            
            for ($j = 0; $j < count($rows); $j++) {
                $problemWithSeq = false;
                if (((int) $rows[$j]['seq']) !== $j) {
                    $allGood = false;
                    $problemWithSeq = true;
                    $allFixed = true;
                    print "Bad sequence in page id " . $cols[$i]['page_id'] . 
                         " col " . $cols[$i]['column_number'] . " at seq=" . $j;
                    // Fix it!
                    if ($doFix) {
                        for ($k = 0; $k < count($rows); $k++) {
                            $updateQuery = "UPDATE $te SET seq=$k WHERE id=" . $rows[$k]['id'] . " AND  valid_until='9999-12-31 23:59:59.999999'";
                            $r3 = $this->getDbConn()->query($updateQuery);
                            if ($r3 === false) {
                                $allFixed = false;
                                print "... ERROR: can't update DB\n";
                                break;
                            } 
                        }
                        if ($problemWithSeq and $allFixed) {
                            print "...fixed\n";
                        }
                    } 
                    else {
                        print "\n";
                    }
                    break;
                }
            }
        }
        if ($allGood) {
            print "All good, no problems with element sequences in database\n";
        }

    }
    
}
