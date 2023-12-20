<?php

namespace APM\CommandLine;

use APM\CommandLine\CommandLineUtility;

class CreateBilderbergDoc extends CommandLineUtility
{

    public function main($argc, $argv): void
    {
        if ($argc < 3) {
            print "Need bilderberg Id and number of pages\n";
            return;
        }

        $bilderbergId = $argv[1];
        if (!str_starts_with($bilderbergId, 'BOOK-DARE-') || strlen($bilderbergId) < 12 ) {
            print "Invalid Bilderberg Id: '$bilderbergId'\n";
            return;
        }

        $title = substr($bilderbergId, 10);

        $type = $argv[3] ?? 'mss';
        $validTypes = [ 'mss', 'print'];
        if (!in_array($type, $validTypes)) {
            print "Invalid document type: '$type'\n";
            return;
        }

        $lang = $argv[4] ?? 'la';

        $validLanguages = [ 'ar', 'he', 'jrb', 'la'];

        if (!in_array($lang, $validLanguages)) {
            print "Invalid language: '$lang'\n";
            return;
        }

        $numPages = intval($argv[2]);
        if ($numPages <= 0) {
            print "Invalid number of pages: $numPages\n";
            return;
        }

        print "Creating document with title '$title', $numPages pages...";

        $doc = $this->systemManager->getDataManager()->getDocByDareId($bilderbergId);
        if ($doc !== null) {
            print "Document already exists with id " . $doc['id'] . "\n";
            return;
        }


        $docId = $this->systemManager->getDataManager()->newDoc(
            $title,
            '',
            $numPages,
            $lang,
            $type,
            'bilderberg',
            $bilderbergId
        );

        if ($docId === false) {
            print "Error creating document\n";
        } else {
            print "new document id = $docId\n";
        }
    }
}