<?php

namespace Test\ThomasInstitut\EntitySystem;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;
use ThomasInstitut\EntitySystem\EntitySystem;

abstract class EntitySystemReferenceTestSuite extends TestCase
{

    abstract public function getEntitySystem() : EntitySystem;


    /**
     * @throws InvalidStatementException
     * @throws StatementAlreadyCancelledException
     * @throws StatementNotFoundException
     */
    public function testEntitySystem() : void{

        $es = $this->getEntitySystem();

        $pName = 101;
        $pType = 10;
        $tPerson = 1001;
//        $this->fillUpEntitySystem($es, $pName);


        $p1 = $es->generateUniqueEntityId();
        $p2 = $es->generateUniqueEntityId();
        $p3 = $es->generateUniqueEntityId();
        $p4 = $es->generateUniqueEntityId();

        $statements = [];


        $statements[] = $es->makeStatement($p1, $pType, $tPerson);
        $statements[] = $es->makeStatement($p1, $pName, 'P1');
        $statements[] = $es->makeStatement($p2, $pType, $tPerson);
        $statements[] = $es->makeStatement($p2, $pName, 'P2');
        $statements[] = $es->makeStatement($p3, $pType, $tPerson);
        $statements[] = $es->makeStatement($p3, $pName, 'P3');

        $foundStatements = $es->getStatements($p2, null, null);
        $this->assertCount(2, $foundStatements);
        foreach($foundStatements as $statement) {
            [ $statementId, $subject, $predicate, $object, $cancellationId ] = $statement;
            $this->assertContains($statementId, $statements);
            $this->assertEquals($p2, $subject);
            $this->assertContains($predicate, [ $pName, $pType]);
            if (is_int($object)) {
                $this->assertEquals($tPerson, $object);
            } else {
                $this->assertIsString($object);
                $this->assertEquals('P2', $object);
            }
            $this->assertNull($cancellationId);
        }

        $foundStatements2 = $es->getStatements($p4, null, null);
        $this->assertCount(0, $foundStatements2);

        $cancellationId1 = $es->cancelStatement($statements[2]);
        $cancellationId2 = $es->cancelStatement($statements[3]);

        $foundStatements = $es->getStatements($p2, null, null, );
        $this->assertCount(0, $foundStatements);


        $foundStatements = $es->getStatements($p2, null, null, true);
        $this->assertCount(2, $foundStatements);
        foreach($foundStatements as $statement) {
            [ $statementId, $subject, $predicate, $object, $cancellationId ] = $statement;
            $this->assertContains($statementId, $statements);
            $this->assertEquals($p2, $subject);
            $this->assertContains($predicate, [ $pName, $pType]);
            if (is_int($object)) {
                $this->assertEquals($tPerson, $object);
            } else {
                $this->assertIsString($object);
                $this->assertEquals('P2', $object);
            }
            if($cancellationId === null) {
                $this->assertContains( $cancellationId, [ $cancellationId1, $cancellationId2]);
            }
        }

    }

    /**
     * @throws InvalidStatementException
     */
    private function fillUpEntitySystem(EntitySystem $es, int $aName) : void {
        $numAttributes = 5;
        $numRelations = 5;
        $statementPerEntity = 3;
        $numEntities= 10;
        $someWords = [ 'piedra' , 'papel', 'tijera', 'tango', 'india', 'azul', 'orange'];

        $attributes = [];
        for($i =0; $i< $numAttributes; $i++) {
            $attributes[] = $es->generateUniqueEntityId();
        }

        $relations = [];
        for($i =0; $i< $numRelations; $i++) {
            $relations[] = $es->generateUniqueEntityId();
        }
        $entities = [];
        for($i = 0; $i < $numEntities; $i++) {
            $id = $es->generateUniqueEntityId();
            $es->makeStatement($id, $aName, "Entity $i");
            $entities[] = $id;
        }

        foreach($entities as $entity) {
            for($i = 0; $i < $statementPerEntity; $i++) {
                $useRelation = random_int(1, 100) > 50;
                if ($useRelation) {
                    $predicate = $relations[random_int(0, count($relations)-1)];
                    $object = $entities[random_int(0, count($entities)-1)];
                } else {
                    $predicate = $attributes[random_int(0, count($attributes)-1)];
                    $object = $someWords[random_int(0, count($someWords)-1)] . " " . $someWords[random_int(0, count($someWords)-1)];
                }
                $es->makeStatement($entity, $predicate, $object);
            }
        }

    }


}