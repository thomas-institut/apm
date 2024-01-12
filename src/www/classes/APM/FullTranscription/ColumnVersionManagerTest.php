<?php


namespace APM\FullTranscription;


use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\TimeString\TimeString;

/**
 * Class ColumnVersionManagerTest
 * Reference test for implementations of ColumnVersionManager
 * @package APM\FullTranscription
 */
class ColumnVersionManagerTest extends TestCase
{

    /**
     * @var ColumnVersionManager
     */
    private $columnVersionManager;
    /**
     * @var string
     */
    private $className;

    protected function setManager(ColumnVersionManager $columnVersionManager, string $className) {
        $this->columnVersionManager = $columnVersionManager;
        $this->className = $className;
    }

    /**
     * Runs all reference test with the given manager using $className as identifier
     * It assumes that the given manager is properly constructed and that there's no versions
     * registered in it.
     *
     * @param ColumnVersionManager $columnVersionManager
     * @param string $className
     */
    public function runAllTests(ColumnVersionManager $columnVersionManager, string $className) {
        $this->setManager($columnVersionManager, $className);

        $this->basicTest();
        $this->exceptionTest();
        $this->testRegistrations();
    }

    public function basicTest() {

        $this->assertCount(0, $this->columnVersionManager->getColumnVersionInfoByPageCol(1,1), $this->className);

        $versionInfo1 = new ColumnVersionInfo();
        $versionInfo1->timeFrom  = TimeString::now();
        $versionInfo1->pageId = 1;
        $versionInfo1->column = 1;
        $versionInfo1->description = 'Test version';
        $versionInfo1->authorTid = 1;

        $this->columnVersionManager->registerNewColumnVersion(1, 1, $versionInfo1);

        $versions = $this->columnVersionManager->getColumnVersionInfoByPageCol(1,1);
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

        $testPageId = 2;
        $testColumnNumber = 1;
        $testAuthorId = 1;

        $goodVersionInfo = new ColumnVersionInfo();
        $goodVersionInfo->timeFrom  = TimeString::now();
        $goodVersionInfo->pageId = $testPageId;
        $goodVersionInfo->column = $testColumnNumber;
        $goodVersionInfo->description = 'Test version';
        $goodVersionInfo->authorTid = $testAuthorId;

        // wrong  page Id
        $exceptionCaught = false;
        try {
            $this->columnVersionManager->registerNewColumnVersion($testPageId+1, $testColumnNumber, $goodVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // wrong column
        $exceptionCaught = false;
        try {
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber+1, $goodVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);


        // wrong authorID
        $badVersionInfo = clone $goodVersionInfo;
        $badVersionInfo->authorTid = 0;
        $exceptionCaught = false;
        try {
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $badVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // wrong timeFrom
        $badVersionInfo->authorTid = $testAuthorId;
        $badVersionInfo->timeFrom = TimeString::TIME_ZERO;
        $exceptionCaught = false;
        try {
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $badVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        // duplicate time (try to register the same version again)
        $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $goodVersionInfo);
        $exceptionCaught = false;
        try {
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $goodVersionInfo);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
    }

    public function testRegistrations() {

        $testPageId = 10;
        $testColumnNumber = 1;
        $testAuthorId = 100;
        $initialTimestamp = 1023882300;
        $timeStampFrequency = 60;
        $initialVersionCount = 5;
        $nVersionsToAddBefore = 2;
        $nVersionsToAddInTheMiddle = 3;

        // populate manager with initial versions
        for ($i = 0; $i < $initialVersionCount; $i++) {
            $versionInfo = new ColumnVersionInfo();
            $versionInfo->pageId = $testPageId;
            $versionInfo->column = $testColumnNumber;
            $versionInfo->description = "Initial test version $i";
            $versionInfo->authorTid = $testAuthorId;
            $versionInfo->isMinor = true;
            $versionInfo->isReview = true;
            $versionInfo->timeFrom = TimeString::fromTimeStamp($initialTimestamp + ($timeStampFrequency * $i));
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $versionInfo);
            $versions = $this->columnVersionManager->getColumnVersionInfoByPageCol($testPageId, $testColumnNumber);

            $context = "TestRegistrations, after adding initial version $i";
            $this->assertCount($i+1, $versions, $context);
            $this->assertVersionSequenceIsCoherent($versions, $context);
        }

        // check all versions
        $versions = $this->columnVersionManager->getColumnVersionInfoByPageCol($testPageId, $testColumnNumber);
        foreach($versions as $version) {
            $this->assertTrue($version->isReview);
            $this->assertTrue($version->isMinor);
        }

        // add versions before the initial time
        for ($i = 0; $i < $nVersionsToAddBefore; $i++) {
            $versionInfo = new ColumnVersionInfo();
            $versionInfo->pageId = $testPageId;
            $versionInfo->column = $testColumnNumber;
            $versionInfo->description = "Pre-version $i";
            $versionInfo->authorTid = $testAuthorId;
            $versionInfo->timeFrom = TimeString::fromTimeStamp($initialTimestamp - ($timeStampFrequency * ($i+1)));
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $versionInfo);
            $versions = $this->columnVersionManager->getColumnVersionInfoByPageCol($testPageId, $testColumnNumber);

            $context = "TestRegistrations, after adding pre-version $i";
            $this->assertCount($initialVersionCount + $i+1, $versions, $context);
            $this->assertVersionSequenceIsCoherent($versions, $context );
        }

        // add versions in the middle
        for ($i = 0; $i < $nVersionsToAddInTheMiddle; $i++) {
            $versionInfo = new ColumnVersionInfo();
            $versionInfo->pageId = $testPageId;
            $versionInfo->column = $testColumnNumber;
            $versionInfo->description = "In the middle version $i";
            $versionInfo->authorTid = $testAuthorId;
            $versionInfo->timeFrom = TimeString::fromTimeStamp($initialTimestamp + ($timeStampFrequency*$i) + $timeStampFrequency/2);
            $this->columnVersionManager->registerNewColumnVersion($testPageId, $testColumnNumber, $versionInfo);
            $versions = $this->columnVersionManager->getColumnVersionInfoByPageCol($testPageId, $testColumnNumber);
            $this->assertCount($initialVersionCount + $nVersionsToAddBefore + $i+1, $versions);
            $this->assertVersionSequenceIsCoherent($versions, "TestRegistrations, after adding in the middle version $i");
        }
    }

    /**
     * @param ColumnVersionInfo[] $versions
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