<?php

namespace APM\CommandLine\Migration33to34;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use APM\System\ApmMySqlTableName;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\Tid;

class FixEnabledWorks extends CommandLineUtility
{

  public function main($argc, $argv): void
    {
        $systemManager = $this->getSystemManager();
        $dbConn = $systemManager->getDbConnection();
        $tableNames = $systemManager->getTableNames();
        $worksTableName = $tableNames[ApmMySqlTableName::TABLE_WORKS];
        $worksDataTable = new MySqlDataTable($dbConn, $worksTableName);


        $es = $this->getSystemManager()->getEntitySystem();

        $worksFixed = 0;

        foreach ($worksDataTable->getAllRows() as $row) {
            $workTid = $row['tid'];
            $title = $row['title'];
            $dareId = $row['dare_id'];
            $enabled = $row['enabled'] === 1;

            try {
                $data = $es->getEntityData($workTid);
                $enabledInEntitySystem = ValueToolBox::valueToBool($data->getObjectForPredicate(Entity::pWorkIsEnabledInApm));
                if ($enabledInEntitySystem !== $enabled) {
                    print "Work $workTid = $dareId: '$title'\n";
                    print "... in DB, enable flag is " .  $row['enabled'] . " = " . ($enabled ? 'true' : 'false') .  "\n";
                    print "... in ES, enable flag is " .  ($enabledInEntitySystem ? 'true' : 'false'). "\n";

                    try {
                        $es->makeStatement(
                            $workTid,
                            Entity::pWorkIsEnabledInApm,
                            ValueToolBox::boolToValue($enabled),
                            Entity::System,
                            'Copied from legacy database',
                            [],
                            -1,
                            'Default value does not correspond to legacy database'
                        );
                    } catch (InvalidObjectException|InvalidSubjectException|InvalidStatementException $e) {
                        print "... ERROR while fixing: " . $e->getMessage() . "\n";
                    }
                    $worksFixed++;
                }


            } catch (EntityDoesNotExistException) {

                print "... work $workTid does not exist";
            }
        }
        if ($worksFixed === 0) {
            print "No fixes needed\n";
        }

    }

}