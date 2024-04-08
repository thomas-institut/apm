<?php

namespace Test\ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\EntitySystem;
use ThomasInstitut\EntitySystem\EntitySystemWithMetadata;
use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;

abstract class EntitySystemWithMetadataReferenceTestSuite extends EntitySystemReferenceTestSuite
{




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

        $this->createEntity($es, self::tPerson, 'Yoko Ono', $editor, $ts);

        $english = $this->createEntity($es, self::tLang, 'English', $editor, $ts);
        $spanish = $this->createEntity($es, self::tLang, 'Spanish', $editor, $ts);
        $this->createEntity($es, self::tLang, 'German', $editor, $ts);


        $tBand = 50001;

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
            $memberOfStatementIds[] = $es->makeStatementWithMetadata($beatle, self::pMemberOf, $theBeatles, [
                    [ self::pStatementAuthor, $editor],
                    [ self::pStatementTimeStamp, $ts],
                    [ self::pEditorialNote, "Well known fact"],
                    [ self::pSource, $theSource]
            ]);
            $speaksStatementIds[] = $es->makeStatementWithMetadata($beatle, self::pSpeaks, $english, [
                [ self::pStatementAuthor, $editor],
                [ self::pStatementTimeStamp, $ts],
                [ self::pEditorialNote, "Comes from England"],
                [ self::pSource, $theSource]
            ]);
        }
        $entitiesToTest = [ $john, $paul, $george, $ringo, $english, $theBeatles];
        $predicatesToAssert = [ self::pName, self::pEntityType ];
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

        $memberOfStatements = $es->getStatements(null, self::pMemberOf, null);
        $this->assertCount(count($memberOfStatementIds), $memberOfStatements);
        foreach($memberOfStatements as $statement) {
            [ $statementId, $subject, $predicate, $object, $cancellationId ] = $statement;
            $this->assertContains($statementId, $memberOfStatementIds);
            $this->assertEquals(self::pMemberOf, $predicate);
            $this->assertIsInt($subject);
            $this->assertIsInt($object);
            $this->assertNull($cancellationId);
        }

        $speaksStatements = $es->getStatements(null, self::pSpeaks, null);
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

        $speaksStatements = $es->getStatements(null, self::pSpeaks, null);
        $this->assertCount(0, $speaksStatements);
        $metadataToAssert = [ self::pCancellationAuthor, self::pCancellationTimestamp, self::pCancellationNote];

        $speaksStatements = $es->getStatements(null, self::pSpeaks, null, true);
        $this->assertCount(count($speaksStatementIds), $speaksStatements);
        foreach($speaksStatements as $statement) {
            [, , $predicate, , $cancellationId, , $cancellationMetadata ] = $statement;
            $this->assertEquals(self::pSpeaks, $predicate);
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

//        print "Making type statement for new entity $id\n";

        $es->makeMultipleStatementAndCancellations([
            [ EntitySystem::MakeStatementCommand, $id, self::pEntityType, $type, $metadata]
        ]);


//        print "Making name statement for new entity $id: '$name'\n";

        $es->makeMultipleStatementAndCancellations([
            [ EntitySystem::MakeStatementCommand, $id, self::pName, $name, $metadata],
        ]);

        return $id;
    }

}