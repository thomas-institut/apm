<?php

namespace APM\CommandLine;

use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use http\Exception\RuntimeException;
use ThomasInstitut\EntitySystem\EntityId;

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

        switch($argv[1]) {
            case 'newId':
                $this->getNewId();
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
        $tid = EntityId::strToTid($tidString);

        if ($tid === -1) {
            print "ERROR: invalid TID '$tidString'\n";
            return;
        }

        printf("Entity %s ( = %d, 0x%s), timestamp %s\n", EntityId::tidToAlphanumeric($tid), $tid, EntityId::tidToHex($tid), EntityId::tidToTimeString($tid));
    }

    private function getNewId() : void{
        try {
            $newId = EntityId::generateUnique();
        } catch(\RuntimeException $exception) {
            print "ERROR: " . $exception->getMessage() . "\n";
            return;
        }
        print $newId . " = " . EntityId::tidToAlphanumeric($newId) . "\n";
    }
}