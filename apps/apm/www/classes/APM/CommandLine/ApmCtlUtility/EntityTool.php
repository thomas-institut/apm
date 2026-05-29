<?php

namespace APM\CommandLine\ApmCtlUtility;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Schema\Entity;
use Exception;
use RuntimeException;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeZoneException;

class EntityTool extends CommandLineUtility implements AdminUtility
{

    const CMD = 'entity';

    const USAGE = self::CMD . " <option>\n\nOptions:\n" .
        " info <id>: prints info about the given entity\n" .
        " newId: generates a new unique entity id\n" .
        " merge <entity1> <entity2>:  merges entity 1 into entity 2\n" .
        " create <type>: creates a new entity\n";
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
                    print "Error: Need an entity id\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->printInfo($argv[2]);
                break;

            case 'merge':
                if (!isset($argv[2]) && !isset($argv[3])) {
                    print "Error: need two entity ids\n";
                    print self::USAGE . "\n";
                    return 0;
                }
                $this->merge($argv[2], $argv[3]);
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


    private function merge(string $entity1, string $entity2) : void {
        $id1 = Tid::fromString($entity1);
        $id2 = Tid::fromString($entity2);

        if ($id1 === -1) {
            print "ERROR: invalid entity id1 '$entity1'\n";
            return;
        }
        $es = $this->getSystemManager()->getEntitySystem();
        try {
            $data1 = $es->getEntityData($id1);
        } catch (EntityDoesNotExistException) {
            print "ERROR: entity $entity1 does not exist\n";
            return;
        }

        if ($data1->isMerged()) {
            print "ERROR: entity $entity1 is already merged into $data1->mergedInto\n";
            return;
        }

        if ($id2 === -1) {
            print "ERROR: invalid entity id2 '$entity2'\n";
            return;
        }
        try {
            $data2 = $es->getEntityData($id2);
        } catch (EntityDoesNotExistException) {
            print "ERROR: entity $entity2 (= $id2) does not exist\n";
            return;
        }
        if ($data1->type !== $data2->type) {
            print "ERROR: entities are not of the same type\n";
            print " Entity $entity1 type: " . $data1->type . "\n";
            print " Entity $entity2 type: " . $data2->type . "\n";
            return;
        }

        print "Are you sure you want to merge $entity1 ('$data1->name') into $entity2 ('$data2->name')?\n";
        print "Type 'yes' to proceed: ";
        $answer = fgets(STDIN);
        if (strtolower(trim($answer)) !== 'yes') {
            print "OK, nothing done\n";
            return;
        }
        print "Merge Editorial Note: ";
        $note = fgets(STDIN);
        $note = trim($note);
        if ($note === '' ) {
            print "Editorial note cannot be empty\n";
            return;
        }

        try {
            $es->mergeEntity($id1, $id2, Entity::System, $note);
        } catch (Exception $e) {
            print "ERROR during merge: " . $e->getMessage() . "\n";
            return;
        }
        print "Success, entities are now merged\n";
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

        $this->getSystemManager()->onEntityDataChange($id, Entity::System);
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
        try {
            $data = $this->getSystemManager()->getEntitySystem()->getEntityData($tid);
        } catch (EntityDoesNotExistException) {
            print "ERROR: Entity does not exist\n";
            return;
        }

        printf("  Type: %d\n", $data->type);
        printf("  Name: %s\n", $data->name);
        printf("  Merged: %s\n", $data->mergedInto === null ? 'No' : $data->mergedInto);
        print("  Statements:\n");

        foreach ($data->statements as $statement) {
            $objectString = gettype($statement->object) === 'string' ? "'$statement->object'" : $statement->object;
            printf ("      %d %s %s\n", $statement->predicate, $objectString, $statement->isCancelled() ? '(Cancelled)' : '');
        }
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