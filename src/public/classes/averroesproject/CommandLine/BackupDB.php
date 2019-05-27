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

namespace AverroesProject\CommandLine;

/**
 * Utility to perform a database backup with mysqldump 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class BackupDB extends CommandLineUtility {
    
    const USAGE = "USAGE: backupdb <output_directory>\n";
    
    public function __construct($config) {
        parent::__construct($config);
        $this->logger = $this->logger->withName('BACKUP');
    }
    
    public function main($argc, $argv)
    {
        $shell = '/bin/bash';
        $mysqldump = 'mysqldump';
        $dateFormat = ' +%Y-%m-%d-%H%M%S';
        $tmpErrFileName= '/tmp/apmbackuptempstderr';
        
        $mySqlDumpPasswordWarning = 'mysqldump: [Warning] Using a password on the command line interface can be insecure.';

        if ($argc != 2) {
            print self::USAGE;
            return false;
        }

        $this->logger->notice("Starting database backup");
              
        $start = microtime(true);
        $outputDir = $argv[1];
        $hostName = gethostname();

        $output = shell_exec("$mysqldump -h " . 
                $this->config['db']['host'] . 
                " -u " .
                $this->config['db']['user'] . 
                " -p" .
                $this->config['db']['pwd'] . 
                " " . 
                $this->config['db']['db'] . 
                " 2>$tmpErrFileName | gzip -9 2>&1 >$outputDir/apm-$hostName-`date $dateFormat`.sql.gz"
                );

        $tmpFileHandle = fopen($tmpErrFileName, "r");
        if (!$tmpFileHandle) {
            $msg = "Can't open mysqldump temp error file";
            $this->logger->error($msg);
            $this->printErrorMsg($msg);
            return false;
        }
        
        $success = true;
        while($f = fgets($tmpFileHandle)){
            $f = rtrim($f);
            if ($f === $mySqlDumpPasswordWarning) {
                continue;
            }
            $success = false;
            $this->logger->error($f);
            $this->printErrorMsg($f);
        }
        
        if ($output !== NULL) {
            $this->logger->error($output);
            $this->printErrorMsg($output);
            $msg = "Backup not done properly";
            $this->logger->error($msg);
            $this->printErrorMsg($msg);
            return false;
        }
        if ($success) {
            $end = microtime(true);
            $elapsedStr = sprintf("%.2f ms", ($end - $start)*1000.0);
            $msg = "The database was successfully backed up in $elapsedStr, output dir: $outputDir";
            $this->logger->notice($msg);
            return true;
        }
        return false;
    }
    
}