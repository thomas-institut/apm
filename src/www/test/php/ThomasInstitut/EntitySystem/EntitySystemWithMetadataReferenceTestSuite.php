<?php

namespace Test\ThomasInstitut\EntitySystem;

use Test\ThomasInstitut\EntitySystem\EntitySystemReferenceTestSuite;
use ThomasInstitut\EntitySystem\EntitySystem;
use ThomasInstitut\EntitySystem\EntitySystemWithMetadata;
use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;

abstract class EntitySystemWithMetadataReferenceTestSuite extends EntitySystemReferenceTestSuite
{

    const eSystem = 1;

    const pEntityType = 5;

    const tEntityType = 10;
    const tRelation = 11;
    const tAttribute = 12;

    const tPerson = 21;
    const tLang = 22;

    const pStatementAuthor = 201;
    const pStatementTimeStamp = 202;
    const pEditorialNote = 203;


    const pCancellationAuthor = 301;
    const pCancellationTimestamp = 302;
    const pCancellationNote= 303;


    const pQualificationLang = 401;

    const pType = 501;
    const pName = 502;

    const pAlias = 503;


    const pSource = 10001;



    abstract public function getEntitySystemWithMetadata() : EntitySystemWithMetadata;
    public function getEntitySystem(): EntitySystem
    {
        return $this->getEntitySystemWithMetadata();
    }


    /**
     * @throws InvalidStatementException
     */
    public function testEntitySystemWithMetadata() : void {

        $es = $this->getEntitySystemWithMetadata();

        $ts = time();

        $editor = $this->createEntity($es, self::tPerson, 'Test Editor', self::eSystem, $ts);

        $john = $this->createEntity($es, self::tPerson, 'John Lennon', $editor, $ts);
        $paul = $this->createEntity($es, self::tPerson, 'Paul McCartney', $editor, $ts);
        $george = $this->createEntity($es, self::tPerson, 'George Harrison', $editor, $ts);
        $ringo = $this->createEntity($es, self::tPerson, 'Ringo Starr', $editor, $ts);

        $english = $this->createEntity($es, self::tLang, 'English', $editor, $ts);
        $spanish = $this->createEntity($es, self::tLang, 'Spanish', $editor, $ts);

        $pSpeaks = $this->createEntity($es, self::tRelation, 'speaks', $editor, $ts);

        $tBand = $this->createEntity($es, self::tEntityType, 'band', $editor, $ts);
        $pMemberOf = $this->createEntity($es, self::tRelation, 'memberOf', $editor, $ts);
        $theBeatles = $this->createEntity($es, $tBand, 'The Beatles', $editor, $ts);

        $theSource = 'My own knowledge';

        $memberOfStatementIds = [];
        $speaksStatementIds = [];




        $es->makeStatementWithMetadata($theBeatles, self::pAlias, 'Los Beatles', [
            [ self::pStatementAuthor, $editor],
            [ self::pStatementTimeStamp, $ts],
            [ self::pEditorialNote, "Se sabe en todo el mundo"],
            [ self::pQualificationLang, $spanish]
        ]);

        foreach( [ $john, $paul, $george, $ringo] as $beatle) {
            $memberOfStatementIds[] = $es->makeStatementWithMetadata($beatle, $pMemberOf, $theBeatles, [
                    [ self::pStatementAuthor, $editor],
                    [ self::pStatementTimeStamp, $ts],
                    [ self::pEditorialNote, "Well known fact"],
                    [ self::pSource, $theSource]
            ]);
            $speaksStatementIds[] = $es->makeStatementWithMetadata($beatle, $pSpeaks, $english, [
                [ self::pStatementAuthor, $editor],
                [ self::pStatementTimeStamp, $ts],
                [ self::pEditorialNote, "Comes from England"],
                [ self::pSource, $theSource]
            ]);
        }
        $entitiesToTest = [ $john, $paul, $george, $ringo, $english, $tBand, $pMemberOf, $theBeatles, $pSpeaks];
        $predicatesToAssert = [ self::pName, self::pType ];
        $metadataToAssert = [ self::pStatementAuthor, self::pStatementTimeStamp];

        // Test entities
        foreach ($entitiesToTest as $index => $entity) {
            $context = "Testing entity index $index";

            $statements = $es->getStatements($entity, null, null);
            $statementPredicates = [];
            $metadataPredicates = [];
            foreach ($statements as $statement) {
                [ , , $predicate, , , $metadata] = $statement;
                $statementPredicates[] = $predicate;
                foreach($metadata as $metadataItem) {
                    [ $metadataPredicate, $metadataItemObject ] = $metadataItem;
                    $metadataPredicates[] = $metadataPredicate;
                    switch($metadataPredicate) {
                        case self::pStatementAuthor:
                            $this->assertEquals($editor, $metadataItemObject, $context);
                            break;

                        case self::pStatementTimeStamp:
                            $this->assertEquals($ts, intval($metadataItemObject));
                            break;

                        case self::pSource:
                            $this->assertEquals($theSource, $metadataItemObject);
                            break;
                    }
                }
            }
            foreach ($predicatesToAssert as $expectedPredicate) {
                $this->assertContains($expectedPredicate, $statementPredicates, $context);
            }
            foreach($metadataToAssert as $metadataPredicate) {
                $this->assertContains($metadataPredicate, $metadataPredicates, $context);
            }
        }

        // test statement Ids

        $memberOfStatements = $es->getStatements(null, $pMemberOf, null);
        $this->assertCount(count($memberOfStatementIds), $memberOfStatements);
        foreach($memberOfStatements as $statement) {
            [ $statementId, $subject, $predicate, $object, $cancellationId ] = $statement;
            $this->assertContains($statementId, $memberOfStatementIds);
            $this->assertEquals($pMemberOf, $predicate);
            $this->assertIsInt($subject);
            $this->assertIsInt($object);
            $this->assertNull($cancellationId);
        }

        $speaksStatements = $es->getStatements(null, $pSpeaks, null);
        $this->assertCount(count($speaksStatementIds), $speaksStatements);

        $cancellationCommands = [];

        foreach($speaksStatementIds as $index => $statementId) {
            $metadata = [
                [ self::pCancellationAuthor, $editor],
                [ self::pCancellationTimestamp, time()],
                [ self::pCancellationNote, "Cancellation $index just for testing"]
            ];
            $cancellationCommands[] = [ EntitySystem::CancelStatementCommand, $statementId,  $metadata ];

        }
        $cancellationIds = $es->makeMultipleStatementAndCancellations($cancellationCommands);
        $this->assertCount(count($cancellationCommands), $cancellationIds);

        $speaksStatements = $es->getStatements(null, $pSpeaks, null);
        $this->assertCount(0, $speaksStatements);
        $metadataToAssert = [ self::pCancellationAuthor, self::pCancellationTimestamp, self::pCancellationNote];

        $speaksStatements = $es->getStatements(null, $pSpeaks, null, true);
        $this->assertCount(count($speaksStatementIds), $speaksStatements);
        foreach($speaksStatements as $statement) {
            [, , $predicate, , $cancellationId, , $cancellationMetadata ] = $statement;
            $this->assertEquals($pSpeaks, $predicate);
            $this->assertNotNull($cancellationId);
            $this->assertContains($cancellationId, $cancellationIds);
            $this->assertNotNull($cancellationMetadata);
            $metadataPredicates = [];
            foreach($cancellationMetadata as $metadatum) {
                $metadataPredicates[] = $metadatum[0];
            }
            $this->assertCount(count($metadataToAssert), $metadataPredicates);
            foreach ($metadataPredicates as $metadataPredicate) {
                $this->assertContains($metadataPredicate, $metadataToAssert);
            }
        }
    }

    private function createEntity(EntitySystemWithMetadata $es, int $type, string $name, int $author, int $ts) : int {
        $id = $es->generateUniqueEntityId();

        $metadata = [
            [ self::pStatementAuthor, $author],
            [ self::pStatementTimeStamp, $ts],
            [ self::pEditorialNote, "Entity Creation: $type:$name"]
        ];

        $es->makeMultipleStatementAndCancellations([
            [ EntitySystem::MakeStatementCommand, $id, self::pType, $type, $metadata],
            [ EntitySystem::MakeStatementCommand, $id, self::pName, $name, $metadata],
        ]);

        return $id;
    }

}