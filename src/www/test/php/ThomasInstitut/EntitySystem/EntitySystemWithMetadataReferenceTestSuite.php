<?php

namespace Test\ThomasInstitut\EntitySystem;

use Test\ThomasInstitut\EntitySystem\EntitySystemReferenceTestSuite;
use ThomasInstitut\EntitySystem\EntitySystem;
use ThomasInstitut\EntitySystem\EntitySystemWithMetadata;
use ThomasInstitut\EntitySystem\Exception\InvalidStatementException;

abstract class EntitySystemWithMetadataReferenceTestSuite extends EntitySystemReferenceTestSuite
{

    const eSystem = 1;

    const tEntityType = 10;
    const tRelation = 11;
    const tAttribute = 12;

    const tPerson = 21;
    const tLang = 22;

    const pStatementAuthor = 201;
    const pStatementTimeStamp = 202;
    const pEditorialNote = 203;

    const pType = 501;
    const pName = 502;



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


        $editor = $this->createEntity($es, self::tPerson, 'Test Editor', self::eSystem);

        $john = $this->createEntity($es, self::tPerson, 'John Lennon', $editor);
        $paul = $this->createEntity($es, self::tPerson, 'Paul McCartney', $editor);
        $george = $this->createEntity($es, self::tPerson, 'George Harrison', $editor);
        $ringo = $this->createEntity($es, self::tPerson, 'Ringo Starr', $editor);

        $english = $this->createEntity($es, self::tLang, 'English', $editor);

        $pSpeaks = $this->createEntity($es, self::tRelation, 'speaks', $editor);

        $tBand = $this->createEntity($es, self::tEntityType, 'band', $editor);
        $pMemberOf = $this->createEntity($es, self::tRelation, 'memberOf', $editor);
        $theBeatles = $this->createEntity($es, $tBand, 'The Beatles', $editor);

        foreach( [ $john, $paul, $george, $ringo] as $beatle) {
            $es->makeStatementWithMetadata($beatle, $pMemberOf, $theBeatles, [
                    [ self::pStatementAuthor, $editor],
                    [ self::pStatementTimeStamp, time()],
                    [ self::pEditorialNote, "Well known fact"]
            ]);
            $es->makeStatementWithMetadata($beatle, $pSpeaks, $english, [
                [ self::pStatementAuthor, $editor],
                [ self::pStatementTimeStamp, time()],
                [ self::pEditorialNote, "Comes from England"]
            ]);
        }
        $entitiesToTest = [ $john, $paul, $george, $ringo, $english, $tBand, $pMemberOf, $theBeatles, $pSpeaks];
        $predicatesToAssert = [ self::pName, self::pType ];
        $metadataToAssert = [ self::pStatementAuthor, self::pStatementTimeStamp];

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
                    if ($metadataPredicate === self::pStatementAuthor) {
                        $this->assertEquals($editor, $metadataItemObject, $context);
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
    }

    private function createEntity(EntitySystemWithMetadata $es, int $type, string $name, int $author) : int {
        $id = $es->generateUniqueEntityId();

        $metadata = [
            [ self::pStatementAuthor, $author],
            [ self::pStatementTimeStamp, time()],
            [ self::pEditorialNote, "Entity Creation: $type:$name"]
        ];

        $es->makeMultipleStatementAndCancellations([
            [ EntitySystem::MakeStatementCommand, $id, self::pType, $type, $metadata],
            [ EntitySystem::MakeStatementCommand, $id, self::pName, $name, $metadata],
        ]);

        return $id;
    }

}