<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace AverroesProject\CommandLine;

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
        
        $te = $this->config['tables']['elements'];
        
        $doFix = false;
        
        if (isset($argv[1]) and $argv[1]==='fix') {
            $doFix = true;
        }
        
        // get the list of defined page_id/column  pairs
        
        $query = "SELECT page_id, column_number, count(*) from $te where valid_until='9999-12-31 23:59:59.999999' GROUP BY page_id,column_number";
        
        $r = $this->dbh->query($query);
        
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
            
            $r2 = $this->dbh->query($query2);
            
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
                            $r3 = $this->dbh->query($updateQuery);
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
