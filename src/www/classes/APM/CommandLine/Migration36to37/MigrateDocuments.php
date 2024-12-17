<?php

namespace APM\CommandLine\Migration36to37;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use APM\System\ApmMySqlTableName;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\Tid;

class MigrateDocuments extends CommandLineUtility
{

    /**
     * @throws EntityDoesNotExistException
     */
    public function main($argc, $argv): void
    {
        $systemManager = $this->getSystemManager();
        $dbConn = $systemManager->getDbConnection();
        $documentsTable = new MySqlDataTable($dbConn, $systemManager->getTableNames()[ApmMySqlTableName::TABLE_DOCS]);
        $statementStorage = $systemManager->createDefaultStatementStorage();
        $creationTimestamp = strval(time());
        $statementMetadata = [
            [Entity::pStatementAuthor, Entity::System],
            [Entity::pStatementTimestamp, $creationTimestamp]
        ];
        $createdDocs = [];
        $es = $this->getSystemManager()->getEntitySystem();


        $languageIds = $es->getAllEntitiesForType(Entity::tLanguage);
        $languageCodes = [];
        foreach ($languageIds as $languageId) {
            $code = $es->getEntityData($languageId)->getObjectForPredicate(Entity::pLangIso639Code);
            $languageCodes[$code] = $languageId;
        }


        $dbConn->beginTransaction();

        foreach ($documentsTable->getAllRows() as $row) {
            $dbId = strval($row['id']);
            $tid = $row['tid'];
            $name = trim($row['title']);
            $lang = $languageCodes[$row['lang']];
            $docType = Entity::DocTypeManuscript;
            if ($row['doc_type'] === 'print') {
                $docType = Entity::DocTypePrint;
            }
            $imageSource = Entity::ImageSourceBilderberg;
            if ($row['image_source'] === 'averroes-server') {
                $imageSource = Entity::ImageSourceAverroesServer;
            }

            $inDare = ValueToolBox::boolToValue($row['in_dare'] !== 0);
            $public = ValueToolBox::boolToValue($row['public'] !== 0);
            $imageSourceData = $row['image_source_data'];
            $useDeepZoom = ValueToolBox::boolToValue($row['deep_zoom'] !== 0);
            print "Importing document $tid = $dbId: '$name'";

            try {
                $data = $es->getEntityData($tid);
                print "... doc $data->id already exists: " . $data->getObjectForPredicate(Entity::pEntityName) . "\n";
            } catch (EntityDoesNotExistException) {
                $commands = [];
                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pEntityType, Entity::tDocument, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pEntityName, $name, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pEntityCreationTimestamp, $creationTimestamp, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pDocumentType, $docType, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pDocumentLanguage, $lang, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pImageSource, $imageSource, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pImageSourceData, $imageSourceData, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pInDare, $inDare, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pIsPublic, $public, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pUseDeepZoomForImages, $useDeepZoom, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pLegacyApmDatabaseId, $dbId, $statementMetadata];
                $statementStorage->storeMultipleStatementsAndCancellations($commands);

                $createdDocs[] = $tid;
            }
            print "\n";
        }

        $dbConn->commit();
        print "Checking data:\n";

        foreach ($createdDocs as $createdSource) {
            try {
                $es->getEntityData($createdSource);
            } catch (EntityDoesNotExistException) {
                print "ERROR: source $createdSource not found in entity system\n";
            }
        }
    }

}