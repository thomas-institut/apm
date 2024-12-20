<?php

namespace APM\CommandLine;

use APM\EntitySystem\Schema\Entity;
use APM\System\Document\Exception\DocumentNotFoundException;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;

class CreateBilderbergDoc extends CommandLineUtility
{

    /**
     * @throws RowAlreadyExists
     * @throws InvalidTimeZoneException
     */
    public function main($argc, $argv): void
    {
        if ($argc < 4) {
            print "Need bilderberg Id, number of pages and language code\n";
            return;
        }

        $bilderbergId = $argv[1];
        if (!str_starts_with($bilderbergId, 'BOOK-DARE-') || strlen($bilderbergId) < 12 ) {
            print "Invalid Bilderberg Id: '$bilderbergId'\n";
            return;
        }


        $numPages = intval($argv[2]);
        if ($numPages <= 0) {
            print "Invalid number of pages: $numPages\n";
            return;
        }

        $lang = $this->getSystemManager()->getLangIdFromCode($argv[1]);
        if ($lang === null) {
            print "Invalid language: $argv[1]\n";
            return;
        }

        $title = substr($bilderbergId, 10);

        $type = Entity::DocTypeManuscript;
        if ($title[0] !== 'M') {
            $type = Entity::DocTypePrint;
        }

        $creationTimeString = TimeString::now();
        $tid = Tid::generateUnique();

        print "Creating document with title '$title', $type, $lang, $numPages pages, tid " .
            Tid::toBase36String($tid) . " ( " . Tid::toTimeString($tid) . " )...";

        // first, see if there's a document with image source data equal to the bilderbergId
        $statements = $this->getSystemManager()->getEntitySystem()->getStatements(null, Entity::pImageSource, $bilderbergId);
        if (count($statements) > 0) {
            $docId = $statements[0]->subject;
            try {
                $docData = $this->getSystemManager()->getDocumentManager()->getDocumentEntityData($docId);
            } catch (DocumentNotFoundException $e) {
                // should never happen
                $this->printErrorMsg("Exception: " . $e->getMessage() . "\n");
                return;
            }
            $legacyId = $docData->getObjectForPredicate(Entity::pLegacyApmDatabaseId);
            print "Document already exists with entity id $docId (legacy DB id = $legacyId)\n";
            return;
        }

        $docId = $this->getSystemManager()->getDocumentManager()->createDocument(
            $title, $lang, $type, Entity::ImageSourceBilderberg, $bilderbergId, Entity::System);

        print "new document id = $docId\n";
    }
}