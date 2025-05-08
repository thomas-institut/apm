<?php

namespace ThomasInstitut\Test\DataCache;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\DataCache\DataCacheReferenceTest;
use ThomasInstitut\DataCache\DirectoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;


class DirectoryDataCacheTest extends TestCase
{

    /**
     * @throws KeyNotInCacheException
     */
    public function testStandardTests() {
        $tester = new DataCacheReferenceTest('DirectoryDataCache');
        $tester->runAllTests(new DirectoryDataCache("/tmp", "DC"), 'DirectoryDataCache');
    }
}