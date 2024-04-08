<?php

namespace Test\ThomasInstitut\EntitySystem;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;
use ThomasInstitut\EntitySystem\EntitySystem;

abstract class EntitySystemReferenceTestSuite extends TestCase
{
    const eSystem = 1;

    const pEntityType = 5;

    const tPerson = 21;
    const tLang = 22;

    const pStatementAuthor = 201;
    const pStatementTimeStamp = 202;
    const pEditorialNote = 203;


    const pCancellationAuthor = 301;
    const pCancellationTimestamp = 302;
    const pCancellationNote= 303;


    const pQualificationLang = 401;

    const pName = 501;

    const pAlias = 502;

    const pMemberOf = 503;
    const pSpeaks = 504;

    const pSource = 505;


    abstract public function getEntitySystem() : EntitySystem;


    /**
     * @throws InvalidStatementException
     * @throws StatementAlreadyCancelledException
     * @throws StatementNotFoundException
     */
    public function testEntitySystem() : void{

        $es = $this->getEntitySystem();

        $pName = self::pName;
        $pType = self::pEntityType;
        $tPerson = self::tPerson;


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

//        $cancellationId1 = $es->cancelStatement($statements[2]);
        $cancellationId2 = $es->cancelStatement($statements[3]);

        $foundStatements = $es->getStatements($p2, null, null, );
        $this->assertCount(1, $foundStatements);


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
            if($cancellationId !== null) {
                $this->assertContains( $cancellationId, [ $cancellationId2]);
            }
        }

    }


}