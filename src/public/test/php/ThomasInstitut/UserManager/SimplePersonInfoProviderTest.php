<?php

namespace ThomasInstitut\UserManager;

use PHPUnit\Framework\TestCase;

class SimplePersonInfoProviderTest extends TestCase
{

    public function testSimple() {



        $testPrefixes = [ 'Person', 'User ', ''];

        foreach($testPrefixes as $prefix) {
            $pip = new SimplePersonInfoProvider($prefix);
            $this->assertNotEquals('', $pip->getFullNameFromId(10));
            $this->assertNotEquals('', $pip->getShortNameFromId(10));

            $this->assertNotEquals($pip->getFullNameFromId(10), $pip->getFullNameFromId(11));
        }




    }
}