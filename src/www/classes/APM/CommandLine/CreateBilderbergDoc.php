<?php

namespace APM\CommandLine;

use ThomasInstitut\EntitySystem\Tid;

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


        $numPages = intval($argv[2]);
        if ($numPages <= 0) {
            print "Invalid number of pages: $numPages\n";
            return;
        }


        $title = substr($bilderbergId, 10);

        $type = 'mss';
        if ($title[0] !== 'M') {
            $type = 'print';
        }



        $lang = 'la';

        if (str_contains($title, 'heb') || str_contains($title, 'ebr') ) {
            $lang = 'he';
        } elseif (str_contains($title, 'ara')) {
            $lang = 'ar';
        }



        $creationDate = $argv[3] ?? '';
        $creationTime = $argv[4] ?? '00:00:00.000000';
        $creationTimeString = '';

        if ($creationDate !== '') {
            $creationTimeString = "$creationDate $creationTime";
        }





        $tid = Tid::generateUnique();
        if ($creationTimeString !== '') {
            try {
                $dt = \DateTime::createFromFormat("Y-m-d H:i:s.u", $creationTimeString);
                $ts = intval($dt->format('Uv'))/1000;
                if (floor($ts) == $ts) {
                    $ts +=  rand(1,999) / 1000;
                }
                $tid = Tid::fromTimestamp($ts);
            } catch (\Exception) {
                $tid = Tid::generateUnique();
            }
        }

        print "Creating document with title '$title', $type, $lang, $numPages pages, tid " .
            Tid::toBase36String($tid) . " ( " . Tid::toTimeString($tid) . " )...";

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
            $bilderbergId,
            $tid,
        );

        if ($docId === false) {
            print "Error creating document\n";
        } else {
            print "new document id = $docId\n";
        }

//        print "\n";


    }
}