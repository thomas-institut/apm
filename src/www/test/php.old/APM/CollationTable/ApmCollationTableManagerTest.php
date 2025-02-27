<?php


namespace Test\APM\CollationTable;


use APM\CollationTable\ApmCollationTableVersionManager;
use APM\CollationTable\CollationTableVersionManagerTest;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataTable\InMemoryDataTable;

class ApmCollationTableManagerTest extends TestCase
{

    public function testManager() {

        $manager = new ApmCollationTableVersionManager(new InMemoryDataTable());

        $tester = new CollationTableVersionManagerTest();

        $tester->runAllTests($manager, 'ApmColumnVersionManager');
    }

}