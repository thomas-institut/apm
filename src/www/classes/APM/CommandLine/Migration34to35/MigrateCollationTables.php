<?php

namespace APM\CommandLine\Migration34to35;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use ThomasInstitut\DataTable\MySqlDataTable;

class MigrateCollationTables extends CommandLineUtility
{

  public function main($argc, $argv): void
  {
      $systemManager = $this->getSystemManager();
      $dbConn = $systemManager->getDbConnection();
      $tableName = $systemManager->getTableNames()[ApmMySqlTableName::TABLE_COLLATION_TABLE];
      $ctDataTable = new MySqlDataTable($dbConn, $tableName);

      $doIt = $argv[1] ?? 'no no no' === 'doIt' ;

      $rows = $ctDataTable->getAllRows();
      $idsCovered = [];
      $queries = [];
      foreach ($rows as $row) {
          $tableId = $row['id'];
          if (in_array($tableId, $idsCovered)) {
              continue;
          }
          [$apmId, $chunkNumber] = explode('-', $row['chunk_id']);
          $chunkNumber = intval($chunkNumber);
          $queries[] = "UPDATE `$tableName` SET `work_id`='$apmId', `chunk_number`=$chunkNumber WHERE `id`=$tableId";
          $idsCovered[] = $tableId;
      }

      if ($doIt) {
          print "Executing " . count($queries) . " queries...";
          $dbConn->beginTransaction();
          foreach ($queries as $query) {
              $dbConn->query($query);
          }
          $dbConn->commit();
          print "Done!\n";
      } else {
          print "If this were for real, " . count($queries) . " queries would be executed.\n";
          for($i=0; $i < 10; $i++) {
              print $queries[$i] . "\n";
          }
      }
  }

}