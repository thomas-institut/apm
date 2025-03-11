<?php

namespace APM\Test\System\EntitySystem;


use APM\EntitySystem\ApmEntitySystem;
use APM\EntitySystem\Exception\EntityAlreadyMergedException;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Schema\Entity;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InMemoryDataTable;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntityDataCache\DataTableEntityDataCache;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;
use ThomasInstitut\EntitySystem\TypeStorageConfig;

class ApmEntitySystemTest extends TestCase
{

    public function setUp(): void
    {
        parent::setUp();
        error_reporting(E_ALL);
    }


    public function makeEmptyEntitySystem(): ApmEntitySystem
    {

        $statementStorageDataTable = new InMemoryDataTable();
        $statementStorage = new DataTableStatementStorage($statementStorageDataTable, []);
        $entityDataCacheDataTable = new InMemoryDataTable();
        $entityDataCache = new DataTableEntityDataCache($entityDataCacheDataTable);
        $defaultTypeConfig = new TypeStorageConfig();

        $mergesDataTable = new InMemoryDataTable();

        $memCache = new InMemoryDataCache();
        $defaultTypeConfig
            ->withType(0)
            ->withStorage($statementStorage)
            ->withDataCache($entityDataCache);

        return new ApmEntitySystem(
            function () use ($defaultTypeConfig, $memCache): TypedMultiStorageEntitySystem {
                return new TypedMultiStorageEntitySystem(
                    Entity::pEntityType,
                    [ $defaultTypeConfig],
                    'asdf' ,
                    $memCache, 'TmSes');
            }, 
            function() use ($mergesDataTable) : DataTable {
                return $mergesDataTable;
            },
            $memCache, 
            'ApmES');
    }



    public function testEmptySystem() {
        $allPeople = $this->makeEmptyEntitySystem()->getAllEntitiesForType(Entity::tPerson);
        $this->assertCount(0, $allPeople);
    }

    /**
     * @return void
     *
     */
    public function testBadType() {
        $this->expectException(InvalidEntityTypeException::class);
        $this->makeEmptyEntitySystem()->createEntity(Tid::generateUnique(), 'asd', 'asd', Entity::System);
    }

    /**
     * @throws InvalidEntityTypeException
     */
    public function testBadAuthor() {
        $this->expectException(InvalidArgumentException::class);
        $this->makeEmptyEntitySystem()->createEntity(Entity::tPerson, 'asd', 'asd', Tid::generateUnique());
    }

    /**
     * @throws InvalidEntityTypeException
     * @throws InvalidObjectException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     * @throws EntityDoesNotExistException
     */
    public function testPeopleCreation() : void{
        $entitySystem = $this->makeEmptyEntitySystem();

        $peopleCreator = $entitySystem->createEntity(Entity::tPerson,
            "People Creator", '', Entity::System);

        $peopleToCreate = [
            [ 'name' => 'John', 'sortName' => 'Lennon, John', 'newName' => "John Lennon"],
            [ 'name' => 'Paul', 'sortName' => 'McCartney, Paul', 'newName' => "Paul McCartney"],
            [ 'name' => 'George', 'sortName' => 'Harrison, George', 'newName' => "George Harrison"],
            [ 'name' => 'Ringo', 'sortName' => 'Starr, Ringo', 'newName' => "Ringo Starr"],
        ];
        $createdPeople = [];
        foreach ($peopleToCreate as $personToCreate) {
            $tid = $entitySystem->createEntity(Entity::tPerson, $personToCreate['name'], '', $peopleCreator);
            $entitySystem->makeStatement($tid, Entity::pSortName, $personToCreate['sortName'], $peopleCreator);
            $createdPeople[] = [
                'name' => $personToCreate['name'],
                'sortName' => $personToCreate['sortName'],
                'newName' => $personToCreate['newName'],
                'tid' => $tid
            ];
        }

        $allPeople = $entitySystem->getAllEntitiesForType(Entity::tPerson);

        foreach ($createdPeople as $createdPerson) {
            $this->assertContains($createdPerson['tid'], $allPeople);
            $this->assertEquals(Entity::tPerson, $entitySystem->getEntityType($createdPerson['tid']));
            $data = $entitySystem->getEntityData($createdPerson['tid']);
            $this->assertFalse($data->isMerged());
            $this->assertCount(1, $data->getAllObjectsForPredicate(Entity::pEntityName));
            $this->assertEquals($createdPerson['name'], $data->getObjectForPredicate(Entity::pEntityName));
            $this->assertCount(1, $data->getAllObjectsForPredicate(Entity::pSortName));
            $this->assertEquals($createdPerson['sortName'], $data->getObjectForPredicate(Entity::pSortName));
        }

        // change names
        foreach ($createdPeople as $createdPerson) {
            $entitySystem->makeStatement($createdPerson['tid'], Entity::pEntityName, $createdPerson['newName'], $peopleCreator);
        }

        $allPeople = $entitySystem->getAllEntitiesForType(Entity::tPerson);
        foreach($createdPeople as $createdPerson) {
            $this->assertContains($createdPerson['tid'], $allPeople);
            $this->assertEquals(Entity::tPerson, $entitySystem->getEntityType($createdPerson['tid']));
            $data = $entitySystem->getEntityData($createdPerson['tid']);
            $this->assertCount(1, $data->getAllObjectsForPredicate(Entity::pEntityName));
            $this->assertEquals($createdPerson['newName'], $data->getObjectForPredicate(Entity::pEntityName));
            $this->assertCount(1, $data->getAllObjectsForPredicate(Entity::pSortName));
            $this->assertEquals($createdPerson['sortName'], $data->getObjectForPredicate(Entity::pSortName));
        }
    }

    /**
     * @return void
     * @throws EntityAlreadyMergedException
     * @throws EntityDoesNotExistException
     * @throws InvalidEntityTypeException
     * @throws InvalidObjectException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     */
    public function testMerges() : void {

        $entitySystem = $this->makeEmptyEntitySystem();
        $peopleCreator = $entitySystem->createEntity(Entity::tPerson,
            "People Creator", '', Entity::System);

        $peopleMerger = $entitySystem->createEntity(Entity::tPerson,
            "People Merger", '', $peopleCreator);


        $theFather = $entitySystem->createEntity(Entity::tPerson,
            "Peter Senior", '', $peopleCreator);



        $names = [ "Peter I", "Peter II", "Peter III", "Peter IV"];

        $tids = [];

        foreach ($names as $name) {
            $tids[] = $entitySystem->createEntity(Entity::tPerson, $name, '', $peopleCreator);
        }

        $entitySystem->makeStatement($theFather, Entity::pParentOf, $tids[0], $peopleCreator);

        for($i = 1; $i < count($tids); $i++) {
            $context = "Merging into person $i";
            $oldPerson = $tids[$i-1];
            $newPerson = $tids[$i];
            $entitySystem->mergeEntity($oldPerson, $newPerson, $peopleMerger, "Merging " . ($i-1) . " into $i");
            $newPersonData = $entitySystem->getEntityData($newPerson);
            $this->assertFalse($newPersonData->isMerged(), $context);
            $allPeople = $entitySystem->getAllEntitiesForType(Entity::tPerson);
            $this->assertContains($newPerson, $allPeople);
            // all the previous people must be now $newPerson
            for ($j = 0; $j < $i; $j++) {
                $data = $entitySystem->getEntityData($tids[$j]);
                $loopContext  = "Checking person $j when the newest person is $i";
                $this->assertTrue($data->isMerged(), $loopContext);
                $this->assertEquals($newPerson, $data->mergedInto, $loopContext);
                $this->assertEquals($tids[$j+1], $data->getObjectForPredicate(Entity::pMergedInto), $loopContext);
                $this->assertFalse(in_array($oldPerson, $allPeople));
            }
            $fatherData = $entitySystem->getEntityData($theFather);
            $this->assertEquals($newPerson, $fatherData->getObjectForPredicate(Entity::pParentOf), $context);
        }
    }

}