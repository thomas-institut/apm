<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\AdminUtility;
use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Schema\Entity;
use RuntimeException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeZoneException;

class EntityTool extends CommandLineUtility implements AdminUtility
{

    const CMD = 'entity';

    const USAGE = self::CMD . " <option>\n\nOptions:\n  info <TID>: prints info about the given entity\n  newId: generates a new unique entity id\n  create <type>: creates a new entity\n";
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

    /**
     * @throws InvalidTimeZoneException|InvalidEntityTypeException
     * @throws EntityDoesNotExistException
     */
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

            case 'create':
                if (!isset($argv[2])) {
                    print "Error: Need a type\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->createEntity(intval($argv[2]));
                break;

            default:
                print "Unrecognized option: "  . $argv[1] ."\n";
                return 0;
        }
        return 1;
    }

    /**
     * @throws InvalidEntityTypeException
     * @throws EntityDoesNotExistException
     */
    private function createEntity(int $type) : void {

        $es = $this->getSystemManager()->getEntitySystem();

        try {
            if ($es->getEntityType($type) !== Entity::tEntityType) {
                print "ERROR: Given type $type is not actually a type\n";
                return;
            }
        } catch (EntityDoesNotExistException $e) {
            print "ERROR: Given type $type does not exist\n";
            return;
        }

        $typeName = $es->getEntityName($type);

        if (!$es->entityCreationAllowedForType($type)) {
            print "Sorry, entities of type $type ($typeName) cannot be created with normal methods\n";
            return;
        }

        print "Are you sure you want to create a new entity of type $type ($typeName)? Type 'yes' to proceed ";
        $answer = fgets(STDIN);
        if (strtolower(trim($answer)) !== 'yes') {
            print "OK, nothing done\n";
            return;
        }
        print "Entity Name: ";
        $name = fgets(STDIN);
        $name = trim($name);

        $id = $es->createEntity($type, $name, '', Entity::System);

        $this->getSystemManager()->onEntityDataChange($id);
        printf("New entity created, id = %d = %s\n", $id, Tid::toBase36String($id));
    }

    /**
     * @throws InvalidTimeZoneException
     */
    private function printInfo(string $tidString) : void {
        $tid = Tid::fromString($tidString);

        if ($tid === -1) {
            print "ERROR: invalid TID '$tidString'\n";
            return;
        }

        printf("Entity %s ( = %d, 0x%s), timestamp %s\n", Tid::toBase36String($tid), $tid, Tid::toHexString($tid), Tid::toTimeString($tid));
    }

    /**
     * @throws InvalidTimeZoneException
     */
    private function getNewTid(int $numTids) : void{
        for ($i = 0; $i < $numTids; $i++) {
            try {
                $tid = Tid::generateUnique();
            } catch(RuntimeException $exception) {
                print "ERROR: " . $exception->getMessage() . "\n";
                return;
            }
            printf("%s, %d, 0x%s, %s\n",Tid::toBase36String($tid), $tid,  Tid::toHexString($tid), Tid::toTimeString($tid) );
        }
    }
}