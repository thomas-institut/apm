<?php

namespace APM\CommandLine;

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

        $lang = $argv[3];
        if (!in_array($lang, [ 'ar', 'he', 'la'])) {
            print "Invalid language: $lang\n";
            return;
        }


        $title = substr($bilderbergId, 10);

        $type = 'mss';
        if ($title[0] !== 'M') {
            $type = 'print';
        }

        $creationTimeString = TimeString::now();
        $tid = Tid::generateUnique();

        print "Creating document with title '$title', $type, $lang, $numPages pages, tid " .
            Tid::toBase36String($tid) . " ( " . Tid::toTimeString($tid) . " )...";

        $doc = $this->getSystemManager()->getDataManager()->getDocByDareId($bilderbergId);
        if ($doc !== null) {
            print "Document already exists with id " . $doc['id'] . "\n";
            return;
        }

        $docId = $this->getSystemManager()->getDataManager()->newDoc(
            $title,
            $numPages,
            $lang,
            $type,
            'bilderberg',
            $bilderbergId,
            $tid,
        );

        if ($docId === false) {
            print "Error creating document\n";
        } else {
            print "new document id = $docId\n";
        }
    }
}