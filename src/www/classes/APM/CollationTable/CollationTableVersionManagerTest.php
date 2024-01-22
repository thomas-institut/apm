<?php


namespace APM\CollationTable;


use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;

/**
 * Class ColumnVersionManagerTest
 * Reference test for implementations of ColumnVersionManager
 * @package APM\FullTranscription
 */
class CollationTableVersionManagerTest extends TestCase
{

    /**
     * @var CollationTableVersionManager
     */
    private $collationTableVersionManager;
    /**
     * @var string
     */
    private $className;

    protected function setManager(CollationTableVersionManager $columnVersionManager, string $className) {
        $this->collationTableVersionManager = $columnVersionManager;
        $this->className = $className;
    }

    /**
     * Runs all reference test with the given manager using $className as identifier
     * It assumes that the given manager is properly constructed and that there's no versions
     * registered in it.
     *
     * @param CollationTableVersionManager $columnVersionManager
     * @param string $className
     */
    public function runAllTests(CollationTableVersionManager $columnVersionManager, string $className) {
        $this->setManager($columnVersionManager, $className);

        $this->basicTest();
        $this->exceptionTest();
        $this->testRegistrations();
    }

    public function basicTest() {

        $testCollationTableId = 1;
        $this->assertCount(0, $this->collationTableVersionManager->getCollationTableVersionInfo($testCollationTableId), $this->className);

        $versionInfo1 = new CollationTableVersionInfo();
        $versionInfo1->timeFrom  = TimeString::now();
        $versionInfo1->collationTableId = $testCollationTableId;
        $versionInfo1->description = 'Test version';
        $versionInfo1->authorTid = 1;

        $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $versionInfo1);

        $versions = $this->collationTableVersionManager->getCollationTableVersionInfo($testCollationTableId);
        $this->assertCount(1, $versions, $this->className);
        $this->assertVersionSequenceIsCoherent($versions, "BasicTest");
        $systemVersion = $versions[0];

        $this->assertEquals($versionInfo1->timeFrom, $systemVersion->timeFrom);
        $this->assertEquals($versionInfo1->description, $systemVersion->description);
        $this->assertEquals($versionInfo1->authorTid, $systemVersion->authorTid);
        $this->assertEquals($versionInfo1->isMinor, $systemVersion->isMinor);
        $this->assertEquals($versionInfo1->isReview, $systemVersion->isReview);
        $this->assertEquals(TimeString::END_OF_TIMES, $systemVersion->timeUntil);

    }

    public function exceptionTest() {

        $testCollationTableId = 101;
        $testAuthorId = 1;

        $goodVersionInfo = new CollationTableVersionInfo();
        $goodVersionInfo->timeFrom  = TimeString::now();
        $goodVersionInfo->collationTableId = $testCollationTableId;
        $goodVersionInfo->description = 'Test version';
        $goodVersionInfo->authorTid = $testAuthorId;

        // wrong  chunk id
        $exceptionCaught = false;
        try {
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId + 1, $goodVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // wrong authorID
        $badVersionInfo = clone $goodVersionInfo;
        $badVersionInfo->authorTid = 0;
        $exceptionCaught = false;
        try {
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $badVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // wrong timeFrom
        $badVersionInfo->authorTid = $testAuthorId;
        $badVersionInfo->timeFrom = TimeString::TIME_ZERO;
        $exceptionCaught = false;
        try {
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $badVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // duplicate time (try to register the same version again)
        $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $goodVersionInfo);
        $exceptionCaught = false;
        try {
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $goodVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
    }

    /**
     * @throws InvalidTimeZoneException
     */
    public function testRegistrations() {

        $testCollationTableId = 102;
        $testAuthorId = 100;
        $initialTimestamp = 1023882300;
        $timeStampFrequency = 60;
        $initialVersionCount = 5;
        $nVersionsToAddBefore = 2;
        $nVersionsToAddInTheMiddle = 3;

        // populate manager with initial versions
        for ($i = 0; $i < $initialVersionCount; $i++) {
            $versionInfo = new CollationTableVersionInfo();
            $versionInfo->collationTableId = $testCollationTableId;
            $versionInfo->description = "Initial test version $i";
            $versionInfo->authorTid = $testAuthorId;
            $versionInfo->isMinor = true;
            $versionInfo->isReview = true;
            $versionInfo->timeFrom = TimeString::fromTimeStamp($initialTimestamp + ($timeStampFrequency * $i));
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $versionInfo);
            $versions = $this->collationTableVersionManager->getCollationTableVersionInfo($testCollationTableId);

            $context = "TestRegistrations, after adding initial version $i";
            $this->assertCount($i+1, $versions, $context);
            $this->assertVersionSequenceIsCoherent($versions, $context);
        }

        // check all versions
        $versions = $this->collationTableVersionManager->getCollationTableVersionInfo($testCollationTableId);
        foreach($versions as $version) {
            $this->assertTrue($version->isReview);
            $this->assertTrue($version->isMinor);
        }

        // add versions before the initial time
        for ($i = 0; $i < $nVersionsToAddBefore; $i++) {
            $versionInfo = new CollationTableVersionInfo();
            $versionInfo->collationTableId = $testCollationTableId;
            $versionInfo->description = "Pre-version $i";
            $versionInfo->authorTid = $testAuthorId;
            $versionInfo->timeFrom = TimeString::fromTimeStamp($initialTimestamp - ($timeStampFrequency * ($i+1)));
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $versionInfo);
            $versions = $this->collationTableVersionManager->getCollationTableVersionInfo($testCollationTableId);

            $context = "TestRegistrations, after adding pre-version $i";
            $this->assertCount($initialVersionCount + $i+1, $versions, $context);
            $this->assertVersionSequenceIsCoherent($versions, $context );
        }

        // add versions in the middle
        for ($i = 0; $i < $nVersionsToAddInTheMiddle; $i++) {
            $versionInfo = new CollationTableVersionInfo();
            $versionInfo->collationTableId = $testCollationTableId;
            $versionInfo->description = "In the middle version $i";
            $versionInfo->authorTid = $testAuthorId;
            $versionInfo->timeFrom = TimeString::fromTimeStamp($initialTimestamp + ($timeStampFrequency*$i) + $timeStampFrequency/2);
            $this->collationTableVersionManager->registerNewCollationTableVersion($testCollationTableId, $versionInfo);
            $versions = $this->collationTableVersionManager->getCollationTableVersionInfo($testCollationTableId);
            $this->assertCount($initialVersionCount + $nVersionsToAddBefore + $i+1, $versions);
            $this->assertVersionSequenceIsCoherent($versions, "TestRegistrations, after adding in the middle version $i");
        }
    }

    /**
     * @param CollationTableVersionInfo[] $versions
     */
    public function assertVersionSequenceIsCoherent(array $versions, string $context) {

        $numVersions = count($versions);

        if ($numVersions === 0) {
            // no versions, nothing to do
            return; // @codeCoverageIgnore
        }

        // check that last version timeUntil is EndOfTime
        //print "$context : Last Version\n";
        //print_r($versions[$numVersions-1]);
        $this->assertEquals(TimeString::END_OF_TIMES, $versions[$numVersions-1]->timeUntil, $context . ", last version");

        if ($numVersions === 1) {
            // nothing else to do
            return;
        }

        // check timeUntil's for the rest of versions
        for ($i = 0; $i < $numVersions - 1; $i++) {
            $this->assertEquals($versions[$i]->timeUntil, $versions[$i+1]->timeFrom, $context . " timeUntil, version index $i of $numVersions");
        }

    }

}