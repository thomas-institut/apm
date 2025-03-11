<?php


namespace APM\Test\System;


use APM\System\Transcription\ApmColumnVersionManager;
use APM\System\Transcription\ColumnVersionManagerTest;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataTable\InMemoryDataTable;
use ThomasInstitut\TimeString\InvalidTimeZoneException;

class ApmColumnVersionManagerTest extends TestCase
{

    /**
     * @throws InvalidTimeZoneException
     */
    public function testManager() {
        $manager = new ApmColumnVersionManager(new InMemoryDataTable());
        $tester = new ColumnVersionManagerTest('ApmColumnVersionManager');
        $tester->runAllTests($manager, 'ApmColumnVersionManager');
    }

}