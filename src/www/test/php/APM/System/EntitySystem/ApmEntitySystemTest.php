<?php

namespace Test\APM\System\EntitySystem;

use APM\System\EntitySystem\ApmEntitySystem;
use APM\System\EntitySystem\ApmEntitySystemInterface;
use APM\System\EntitySystem\EntityDoesNotExistException;
use APM\System\EntitySystem\EntityType;
use APM\System\EntitySystem\InvalidEntityTypeException;
use APM\System\EntitySystem\InvalidObjectException;
use APM\System\EntitySystem\InvalidStatementException;
use APM\System\EntitySystem\InvalidSubjectException;
use APM\System\EntitySystem\PersonPredicate;
use APM\System\EntitySystem\SystemPredicate;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataTable\InMemoryDataTable;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntityDataCache\DataTableEntityDataCache;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;
use ThomasInstitut\EntitySystem\TypeStorageConfig;

class ApmEntitySystemTest extends TestCase
{

    private ApmEntitySystem $entitySystem;


    public function __construct($name)
    {
        parent::__construct($name);
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

        $this->entitySystem = new ApmEntitySystem(
            function () use ($defaultTypeConfig, $memCache): TypedMultiStorageEntitySystem {
                return new TypedMultiStorageEntitySystem(
                    SystemPredicate::EntityType,
                    [ $defaultTypeConfig],
                    'asdf' ,
                    $memCache, 'TMSES');
            }, $mergesDataTable, $memCache, 'ApmES');
    }



    public function testEmptySystem() {
        $allPeople = $this->entitySystem->getAllEntitiesForType(EntityType::Person);
        $this->assertCount(0, $allPeople);
    }

    /**
     * @return void
     *
     */
    public function testBadType() {
        $this->expectException(InvalidEntityTypeException::class);
        $this->entitySystem->createEntity(Tid::generateUnique(), 'asd', 'asd', ApmEntitySystemInterface::SystemEntity);
    }

    /**
     * @throws InvalidEntityTypeException
     */
    public function testBadAuthor() {
        $this->expectException(\InvalidArgumentException::class);
        $this->entitySystem->createEntity(EntityType::Person, 'asd', 'asd', Tid::generateUnique());
    }

    /**
     * @throws InvalidEntityTypeException
     * @throws InvalidObjectException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     * @throws EntityDoesNotExistException
     * @depends testEmptySystem
     */
    public function testPeopleCreation() {

        $peopleCreator = $this->entitySystem->createEntity(EntityType::Person,
            "People Creator", '', ApmEntitySystemInterface::SystemEntity);

        $peopleToCreate = [
            [ 'name' => 'John', 'sortName' => 'Lennon, John', 'newName' => "John Lennon"],
            [ 'name' => 'Paul', 'sortName' => 'McCartney, Paul', 'newName' => "Paul McCartney"],
            [ 'name' => 'George', 'sortName' => 'Harrison, George', 'newName' => "George Harrison"],
            [ 'name' => 'Ringo', 'sortName' => 'Starr, Ringo', 'newName' => "Ringo Starr"],
        ];
        $createdPeople = [];
        foreach ($peopleToCreate as $personToCreate) {
            $tid = $this->entitySystem->createEntity(EntityType::Person, $personToCreate['name'], '', $peopleCreator);
            $this->entitySystem->makeStatement($tid, PersonPredicate::SortName, $personToCreate['sortName'], $peopleCreator);
            $createdPeople[] = [
                'name' => $personToCreate['name'],
                'sortName' => $personToCreate['sortName'],
                'newName' => $personToCreate['newName'],
                'tid' => $tid
            ];
        }

        $allPeople = $this->entitySystem->getAllEntitiesForType(EntityType::Person);

        foreach ($createdPeople as $createdPerson) {
            $this->assertContains($createdPerson['tid'], $allPeople);
            $this->assertEquals(EntityType::Person, $this->entitySystem->getEntityType($createdPerson['tid']));
            $data = $this->entitySystem->getEntityData($createdPerson['tid']);
            $this->assertCount(1, $data->getAllObjectsForPredicate(SystemPredicate::EntityName));
            $this->assertEquals($createdPerson['name'], $data->getObjectForPredicate(SystemPredicate::EntityName));
            $this->assertCount(1, $data->getAllObjectsForPredicate(PersonPredicate::SortName));
            $this->assertEquals($createdPerson['sortName'], $data->getObjectForPredicate(PersonPredicate::SortName));
        }

        // change names
        foreach ($createdPeople as $createdPerson) {
            $this->entitySystem->makeStatement($createdPerson['tid'], SystemPredicate::EntityName, $createdPerson['newName'], $peopleCreator);
        }

        $allPeople = $this->entitySystem->getAllEntitiesForType(EntityType::Person);
        foreach($createdPeople as $createdPerson) {
            $this->assertContains($createdPerson['tid'], $allPeople);
            $this->assertEquals(EntityType::Person, $this->entitySystem->getEntityType($createdPerson['tid']));
            $data = $this->entitySystem->getEntityData($createdPerson['tid']);
            $this->assertCount(1, $data->getAllObjectsForPredicate(SystemPredicate::EntityName));
            $this->assertEquals($createdPerson['newName'], $data->getObjectForPredicate(SystemPredicate::EntityName));
            $this->assertCount(1, $data->getAllObjectsForPredicate(PersonPredicate::SortName));
            $this->assertEquals($createdPerson['sortName'], $data->getObjectForPredicate(PersonPredicate::SortName));
        }
    }

}