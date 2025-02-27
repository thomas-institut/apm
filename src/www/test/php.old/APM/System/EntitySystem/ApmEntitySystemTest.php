<?php

namespace Test\APM\System\EntitySystem;

use APM\System\EntitySystem\Exception\Exception\Exception\ApmEntitySystem;
use APM\System\EntitySystem\Exception\Exception\Exception\ApmEntitySystemInterface;
use APM\System\EntitySystem\Exception\Exception\Exception\EntityAlreadyMergedException;
use APM\System\EntitySystem\Exception\Exception\Exception\EntityDoesNotExistException;
use APM\System\EntitySystem\Exception\Exception\Exception\EntityType;
use APM\System\EntitySystem\Exception\Exception\Exception\InvalidEntityTypeException;
use APM\System\EntitySystem\Exception\Exception\Exception\InvalidObjectException;
use APM\System\EntitySystem\Exception\Exception\Exception\InvalidStatementException;
use APM\System\EntitySystem\Exception\Exception\Exception\InvalidSubjectException;
use APM\System\EntitySystem\Exception\Exception\Exception\PersonPredicate;
use APM\System\EntitySystem\Exception\Exception\Exception\SystemPredicate;
use InvalidArgumentException;
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
                    SystemPredicate::EntityType,
                    [ $defaultTypeConfig],
                    'asdf' ,
                    $memCache, 'TMSES');
            }, $mergesDataTable, $memCache, 'ApmES');
    }



    public function testEmptySystem() {
        $allPeople = $this->makeEmptyEntitySystem()->getAllEntitiesForType(EntityType::Person);
        $this->assertCount(0, $allPeople);
    }

    /**
     * @return void
     *
     */
    public function testBadType() {
        $this->expectException(InvalidEntityTypeException::class);
        $this->makeEmptyEntitySystem()->createEntity(Tid::generateUnique(), 'asd', 'asd', ApmEntitySystemInterface::SystemEntity);
    }

    /**
     * @throws InvalidEntityTypeException
     */
    public function testBadAuthor() {
        $this->expectException(InvalidArgumentException::class);
        $this->makeEmptyEntitySystem()->createEntity(EntityType::Person, 'asd', 'asd', Tid::generateUnique());
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

        $peopleCreator = $entitySystem->createEntity(EntityType::Person,
            "People Creator", '', ApmEntitySystemInterface::SystemEntity);

        $peopleToCreate = [
            [ 'name' => 'John', 'sortName' => 'Lennon, John', 'newName' => "John Lennon"],
            [ 'name' => 'Paul', 'sortName' => 'McCartney, Paul', 'newName' => "Paul McCartney"],
            [ 'name' => 'George', 'sortName' => 'Harrison, George', 'newName' => "George Harrison"],
            [ 'name' => 'Ringo', 'sortName' => 'Starr, Ringo', 'newName' => "Ringo Starr"],
        ];
        $createdPeople = [];
        foreach ($peopleToCreate as $personToCreate) {
            $tid = $entitySystem->createEntity(EntityType::Person, $personToCreate['name'], '', $peopleCreator);
            $entitySystem->makeStatement($tid, PersonPredicate::SortName, $personToCreate['sortName'], $peopleCreator);
            $createdPeople[] = [
                'name' => $personToCreate['name'],
                'sortName' => $personToCreate['sortName'],
                'newName' => $personToCreate['newName'],
                'tid' => $tid
            ];
        }

        $allPeople = $entitySystem->getAllEntitiesForType(EntityType::Person);

        foreach ($createdPeople as $createdPerson) {
            $this->assertContains($createdPerson['tid'], $allPeople);
            $this->assertEquals(EntityType::Person, $entitySystem->getEntityType($createdPerson['tid']));
            $data = $entitySystem->getEntityData($createdPerson['tid']);
            $this->assertFalse($data->isMerged());
            $this->assertCount(1, $data->getAllObjectsForPredicate(SystemPredicate::EntityName));
            $this->assertEquals($createdPerson['name'], $data->getObjectForPredicate(SystemPredicate::EntityName));
            $this->assertCount(1, $data->getAllObjectsForPredicate(PersonPredicate::SortName));
            $this->assertEquals($createdPerson['sortName'], $data->getObjectForPredicate(PersonPredicate::SortName));
        }

        // change names
        foreach ($createdPeople as $createdPerson) {
            $entitySystem->makeStatement($createdPerson['tid'], SystemPredicate::EntityName, $createdPerson['newName'], $peopleCreator);
        }

        $allPeople = $entitySystem->getAllEntitiesForType(EntityType::Person);
        foreach($createdPeople as $createdPerson) {
            $this->assertContains($createdPerson['tid'], $allPeople);
            $this->assertEquals(EntityType::Person, $entitySystem->getEntityType($createdPerson['tid']));
            $data = $entitySystem->getEntityData($createdPerson['tid']);
            $this->assertCount(1, $data->getAllObjectsForPredicate(SystemPredicate::EntityName));
            $this->assertEquals($createdPerson['newName'], $data->getObjectForPredicate(SystemPredicate::EntityName));
            $this->assertCount(1, $data->getAllObjectsForPredicate(PersonPredicate::SortName));
            $this->assertEquals($createdPerson['sortName'], $data->getObjectForPredicate(PersonPredicate::SortName));
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
        $peopleCreator = $entitySystem->createEntity(EntityType::Person,
            "People Creator", '', ApmEntitySystemInterface::SystemEntity);

        $peopleMerger = $entitySystem->createEntity(EntityType::Person,
            "People Merger", '', $peopleCreator);


        $theFather = $entitySystem->createEntity(EntityType::Person,
            "Peter Senior", '', $peopleCreator);



        $names = [ "Peter I", "Peter II", "Peter III", "Peter IV"];

        $tids = [];

        foreach ($names as $name) {
            $tids[] = $entitySystem->createEntity(EntityType::Person, $name, '', $peopleCreator);
        }

        $entitySystem->makeStatement($theFather, PersonPredicate::FatherOf, $tids[0], $peopleCreator);

        for($i = 1; $i < count($tids); $i++) {
            $context = "Merging into person $i";
            $oldPerson = $tids[$i-1];
            $newPerson = $tids[$i];
            $entitySystem->mergeEntity($oldPerson, $newPerson, $peopleMerger, "Merging " . ($i-1) . " into $i");
            $newPersonData = $entitySystem->getEntityData($newPerson);
            $this->assertFalse($newPersonData->isMerged(), $context);
            $allPeople = $entitySystem->getAllEntitiesForType(EntityType::Person);
            $this->assertContains($newPerson, $allPeople);
            // all the previous people must be now $newPerson
            for ($j = 0; $j < $i; $j++) {
                $data = $entitySystem->getEntityData($tids[$j]);
                $loopContext  = "Checking person $j when the newest person is $i";
                $this->assertTrue($data->isMerged(), $loopContext);
                $this->assertEquals($newPerson, $data->mergedInto, $loopContext);
                $this->assertEquals($tids[$j+1], $data->getObjectForPredicate(SystemPredicate::MergedInto), $loopContext);
                $this->assertFalse(in_array($oldPerson, $allPeople));
            }
            $fatherData = $entitySystem->getEntityData($theFather);
            $this->assertEquals($newPerson, $fatherData->getObjectForPredicate(PersonPredicate::FatherOf), $context);
        }
    }

}