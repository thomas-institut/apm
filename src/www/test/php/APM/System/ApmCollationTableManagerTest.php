<?php


namespace APM\Test\System;


use APM\CollationTable\ApmCollationTableVersionManager;
use APM\CollationTable\CollationTableVersionManagerTest;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataTable\InMemoryDataTable;
use ThomasInstitut\TimeString\InvalidTimeZoneException;

class ApmCollationTableManagerTest extends TestCase
{

    /**
     * @throws InvalidTimeZoneException
     */
    public function testManager() {

        $manager = new ApmCollationTableVersionManager(new InMemoryDataTable());
        $tester = new CollationTableVersionManagerTest("ApmCollationTableVersionManager");
        $tester->runAllTests($manager, 'ApmColumnVersionManager');
    }

}