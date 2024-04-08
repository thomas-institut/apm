<?php

namespace APM\CommandLine\DataGrabber;

use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;

class ViafIdGrabber extends CommandLineUtility implements AdminUtility
{
    const CMD = 'viaf';

    const USAGE = self::CMD . " <option>\n\nOptions:\n  read, replace, add\n";
    const DESCRIPTION = "Grabs people external ids from VIAF";

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
            case 'read':
                $this->read();
                break;

            case 'replace':
                $this->replace();
                break;

            case 'add':
                $this->add();
                break;

            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return 0;
        }
        return 1;
    }


    private function getTidsFromArgv() : array {

        if ($this->argc < 2) {
            return [];
//            return $es->getAllEntitiesForType(Entity::tPerson);
        }
        $es = $this->getSystemManager()->getEntitySystem();
        $tids = [];
        for($i  = 2; $i < $this->argc; $i++) {
            $tid = $es->getEntityIdFromString($this->argv[$i]);
            if ($tid !== -1) {
                $tids[] = $tid;
            }
        }
        return $tids;
    }
    private function read() : void {

        $tids = $this->getTidsFromArgv();

        if (count($tids) === 0) {
            print "Please enter a list of entities separated by spaces\n";
            return;
        }

        $es = $this->getSystemManager()->getEntitySystem();

        foreach ($tids as $tid) {
            print "Reading VIAF data for entity $tid:\n";

            try {
                $entityData = $es->getEntityData($tid);
            } catch (EntityDoesNotExistException $e) {
                print "  ERROR: Entity does not exist\n";
                continue;
            }

            if ($entityData->type !== Entity::tPerson) {
                print "  ERROR: Entity is not a Person\n";
                continue;
            }

            print "  Name: $entityData->name\n";

            $viafId = $entityData->getObjectForPredicate(Entity::pExternalId, Entity::pObjectIdType, Entity::IdTypeViaf);

            if ($viafId === null) {
                print "  ERROR: no VIAF id found\n";
                continue;
            }

            print "  VIAF ID: $viafId\n";

        }

    }

    private function replace() {

    }

    private function add() {

    }
}