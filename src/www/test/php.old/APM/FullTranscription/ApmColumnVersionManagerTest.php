<?php


namespace Test\APM\FullTranscription;


use APM\FullTranscription\ApmColumnVersionManager;
use APM\FullTranscription\ColumnVersionManagerTest;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataTable\InMemoryDataTable;

class ApmColumnVersionManagerTest extends TestCase
{

    public function testManager() {

        $manager = new ApmColumnVersionManager(new InMemoryDataTable());

        $tester = new ColumnVersionManagerTest();

        $tester->runAllTests($manager, 'ApmColumnVersionManager');
    }

}