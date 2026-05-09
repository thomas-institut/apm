<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\CommandLineUtility;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use ThomasInstitut\EntitySystem\Tid;

class DocTool extends CommandLineUtility implements AdminUtility
{

    const CMD = 'doc';

    const string USAGE = self::CMD . " <docId> <option>\n\nOptions:\n" .
    " page <pageNumber> setSeq <seq>\n";
    const string DESCRIPTION = "Document related functions";

    public function getCommand(): string
    {
        return self::CMD;
    }

    public function getHelp(): string
    {
        return self::USAGE;
    }

    public function getDescription(): string
    {
        return self::DESCRIPTION;
    }

    public function main($argc, $argv): int
    {
        if ($argc < 2) {
            print self::USAGE . "\n";
            return 0;
        }
        $docIdStr = $argv[1] ?? null;

        if ($docIdStr === null) {
            print "Please enter a document id\n";
            print self::USAGE . "\n";
            return 0;
        }

        $docId = Tid::fromString($docIdStr);

        $docMgr = $this->getSystemManager()->getDocumentManager();

        try {
            $docInfo = $docMgr->getDocInfo($docId);
            $cmd = $argv[2] ?? '';

            switch ($cmd) {
                case 'page':
                    $pageNumber = intval($argv[3] ?? -1);
                    if ($pageNumber < 1) {
                        print "Please enter a page number\n";
                        return 0;
                    }
                    $pageId = $docMgr->getPageIdByDocPage($docId, $pageNumber);
                    $currentPageInfo = $docMgr->getPageInfo($pageId);
                    $pageCmd = $argv[4] ?? '';

                    switch ($pageCmd) {
                        case 'setSeq':
                            $newSeq = intval($argv[5] ?? -1);
                            if ($newSeq < 1) {
                                print "Please enter a sequence number\n";
                                return 0;
                            }

                            if ($currentPageInfo->sequence === $newSeq) {
                                print "Page $pageNumber already has sequence $newSeq\n";
                                return 0;
                            }
                            $currentPageInfo->sequence = $newSeq;
                            $docMgr->updatePageSettings($pageId, $currentPageInfo);
                            print "Page sequence for $pageNumber in doc $docIdStr set to $newSeq\n";


                        default:
                            print "Unknown command\n";
                            return 0;
                    }


                default:
                    print "Unknown command\n";
                    return 0;
            }

        } catch (DocumentNotFoundException) {
            print "Document $docIdStr not found\n";
            return 0;
        } catch (PageNotFoundException $e) {
            print "Page $pageNumber not found in document $docIdStr\n";
            return 0;
        }

    }
}