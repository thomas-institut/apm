<?php

namespace APM\Test\Core\Token;

use APM\Core\Token\Normalizer\ToLowerCaseNormalizer;
use APM\Core\Token\Token;
use APM\Core\Token\TokenType;
use APM\Core\Witness\StringWitness;
use PHPUnit\Framework\TestCase;

class ToLowerNormalizerTest extends TestCase
{

    public function testSimple() {

        $norm = new ToLowerCaseNormalizer();

        $this->assertEquals('abc', $norm->normalizeString('ABC'));
    }

    public function testSimpleToken() {
        $norm = new ToLowerCaseNormalizer();

        $testToken = new Token(TokenType::WORD, 'ABC');

        $normTokens = $norm->normalizeToken($testToken);

        $this->assertCount(1, $normTokens);
        $this->assertEquals('abc', $normTokens[0]->getNormalization());

        $testToken2 = new Token(TokenType::WORD, 'ABC', 'customNormalization');
        $normTokens2 = $norm->normalizeToken($testToken2);
        $this->assertCount(1, $normTokens2);
        $this->assertEquals('customnormalization', $normTokens2[0]->getNormalization());

        $normTokens3 = $norm->normalizeToken($testToken2, true);
        $this->assertEquals('abc', $normTokens3[0]->getNormalization());
    }


    public function testStringWitness() {
        $norm = new ToLowerCaseNormalizer();

        $w = new StringWitness('AW01', '21', 'This is a test');

        $initialTokens = $w->getTokens();

        $this->assertEquals('This', $initialTokens[0]->getNormalization());

        $w->applyTokenNormalization($norm, true);

        $normTokens = $w->getTokens();
        $this->assertEquals('this', $normTokens[0]->getNormalization());

    }
}