<?php

namespace Test\APM\Core\Token\Normalizer;

use APM\Core\Token\Normalizer\RemoveHamzahMaddahFromAlifWawYahNormalizer;
use PHPUnit\Framework\TestCase;

class ArabicNormalizersTest extends TestCase
{

    public function testAlifNormalizer() {

        $normalizer = new RemoveHamzahMaddahFromAlifWawYahNormalizer();

        $testCases = [
            [ 'input' => 'العربية',  'expected' => 'العربية', 'testTitle' => "No changes"],
            [ 'input' => 'أكثر', 'expected' => 'اكثر', 'testTitle' => 'Hamza above'],
            [ 'input' => 'وإثيوبيا', 'expected' => 'واثيوبيا', 'testTitle' => 'Hamza below']

            ];

        foreach($testCases as $testCase) {
            $this->assertEquals($testCase['expected'], $normalizer->normalizeString($testCase['input']), $testCase['testTitle']);
        }
    }

}