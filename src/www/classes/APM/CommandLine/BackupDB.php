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

/**
 * Utility to perform a database backup with mysqldump 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class BackupDB extends CommandLineUtility {
    
    const USAGE = "USAGE: backupdb <output_directory>\n";

    const CACHE_TABLES = [ ApmMySqlTableName::TABLE_SYSTEM_CACHE];
    
    public function __construct(array $config, int $argc, array $argv) {
        parent::__construct($config, $argc, $argv);
        $this->logger = $this->logger->withName('BACKUP');
    }
    
    public function main($argc, $argv)
    {
        $shell = '/bin/bash';
        $mysqldump = 'mysqldump';
        $dateFormat = 'Y-m-d-His';
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

        $tableNames = $this->getSystemManager()->getTableNames();
        $databaseName = $this->config['db']['db'];
        $ignoreTablesCommand = '';
        foreach(self::CACHE_TABLES as $table) {
            $tableName = $tableNames[$table];
            $ignoreTablesCommand .= ' --ignore-table=' . $databaseName . '.' . $tableName;
        }

        $mysqldumpCommandFirstPart = "$mysqldump -h " . $this->config['db']['host'] .
            " -u " .   $this->config['db']['user'] .
            " -p" .    $this->config['db']['pwd'] .
            " ";


        $date = date($dateFormat);
        $outputFileName = "$outputDir/apm-$hostName-$date.sql";
        $mysqlDumpCommandStructure = $mysqldumpCommandFirstPart . '--no-data ' . $databaseName . ' >' . $outputFileName;
        $mysqlDumpCommandData = $mysqldumpCommandFirstPart . '--no-create-info' . $ignoreTablesCommand . ' ' . $databaseName . ' >> ' . $outputFileName;

        $mySqlCommands = [$mysqlDumpCommandStructure, $mysqlDumpCommandData];

        $success = true;

        foreach($mySqlCommands as $mySqlCommand) {
            $output = shell_exec($mySqlCommand . " 2>$tmpErrFileName" );
            $tmpFileHandle = fopen($tmpErrFileName, "r");
            if (!$tmpFileHandle) {
                $msg = "Can't open mysqldump temp error file";
                $this->logger->error($msg);
                $this->printErrorMsg($msg);
                return false;
            }
            // process error file completely before moving on
            while($f = fgets($tmpFileHandle)){
                $f = rtrim($f);
                if ($f === $mySqlDumpPasswordWarning) {
                    continue;
                }
                $success = false;
                $this->logger->error($f);
                $this->printErrorMsg($f);
                $this->printErrorMsg("When running: $mySqlCommand");
            }
            if (!$success) {
                break;
            }
            if ($output !== NULL) {
                $this->logger->error($output);
                $this->printErrorMsg($output);
                $msg = "Backup not done properly";
                $this->logger->error($msg);
                $this->printErrorMsg($msg);
                return false;
            }
        }
        if (!$success) {
            return false;
        }

        // mysqldump was successful, now just compress the file
        $uncompressedFileSize = round(filesize($outputFileName)/(1024*1024), 2);
        $compressCommand = "gzip $outputFileName 2>$tmpErrFileName";
        $output = shell_exec($compressCommand);
        $tmpFileHandle = fopen($tmpErrFileName, "r");
        if (!$tmpFileHandle) {
            $msg = "Can't open gzip temp error file";
            $this->logger->error($msg);
            $this->printErrorMsg($msg);
            return false;
        }

        while($f = fgets($tmpFileHandle)){
            $f = rtrim($f);
            $success = false;
            $this->logger->error($f);
            $this->printErrorMsg($f);
        }

        if ($output !== NULL) {
            $this->logger->error($output);
            $this->printErrorMsg($output);
            $msg = "Error while compressing backup file $outputFileName";
            $this->logger->error($msg);
            $this->printErrorMsg($msg);
            return false;
        }

        if (!$success) {
            return false;
        }


         $end = microtime(true);
         $elapsedStr = sprintf("%.2f ms", ($end - $start)*1000.0);
         $compressedFileSize =round(filesize($outputFileName . ".gz")/(1024*1024), 2);
         $msg = "The database was successfully backed up in $elapsedStr, output dir: $outputDir";
         $this->logger->notice($msg);
         $this->logger->info("Uncompressed backup size: " . $uncompressedFileSize . "MB");
        $this->logger->info("Compressed backup size: " . $compressedFileSize . "MB");
         return true;
    }


    
}