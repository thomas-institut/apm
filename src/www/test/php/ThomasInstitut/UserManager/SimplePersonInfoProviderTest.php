<?php

namespace Test\ThomasInstitut\UserManager;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\AuthService\SimplePersonInfoProvider;

class SimplePersonInfoProviderTest extends TestCase
{

    public function testSimple() {



        $testPrefixes = [ 'Person', 'User ', ''];

        foreach($testPrefixes as $prefix) {
            $pip = new SimplePersonInfoProvider($prefix);
            $this->assertNotEquals('', $pip->getNormalizedName(10));
            $this->assertNotEquals('', $pip->getShortName(10));

            $this->assertNotEquals($pip->getNormalizedName(10), $pip->getNormalizedName(11));
        }




    }
}