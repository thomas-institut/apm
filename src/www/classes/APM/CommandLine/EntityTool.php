<?php

namespace APM\CommandLine;

use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use http\Exception\RuntimeException;
use ThomasInstitut\EntitySystem\Tid;

class EntityTool extends CommandLineUtility implements AdminUtility
{

    const CMD = 'entity';

    const USAGE = self::CMD . " <option>\n\nOptions:\n  info <TID>: prints info about the given entity\n  newId: generates a new unique entity id\n";
    const DESCRIPTION = "Entity related functions";

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

    public function main($argc, $argv) : int
    {
        if ($argc === 1) {
            print self::USAGE . "\n";
            return 0;
        }

        switch(strtolower($argv[1])) {
            case 'newid':
                $numTids = 1;
                if (isset($argv[2])) {
                    $numTids = intval($argv[2]);
                    if ($numTids === 0) {
                        $numTids = 1;
                    }
                }
                $this->getNewTid($numTids);
                break;

            case 'info':
                if (!isset($argv[2])) {
                    print "Error: Need a TID\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->printInfo($argv[2]);

                break;

            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return 0;
        }
        return 1;
    }

    private function printInfo(string $tidString) : void {
        $tid = Tid::fromString($tidString);

        if ($tid === -1) {
            print "ERROR: invalid TID '$tidString'\n";
            return;
        }

        printf("Entity %s ( = %d, 0x%s), timestamp %s\n", Tid::toBase36String($tid), $tid, Tid::toHexString($tid), Tid::toTimeString($tid));
    }

    private function getNewTid(int $numTids) : void{
        for ($i = 0; $i < $numTids; $i++) {
            try {
                $tid = Tid::generateUnique();
            } catch(\RuntimeException $exception) {
                print "ERROR: " . $exception->getMessage() . "\n";
                return;
            }
            printf("%s, %d, 0x%s, %s\n",Tid::toBase36String($tid), $tid,  Tid::toHexString($tid), Tid::toTimeString($tid) );
        }
    }
}