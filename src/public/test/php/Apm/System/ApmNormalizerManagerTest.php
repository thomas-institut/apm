<?php


namespace APM\Core\Token\Normalizer;


use APM\Core\Token\Token;
use APM\Core\Token\TokenType;
use APM\System\ApmNormalizerManager;
use PHPUnit\Framework\TestCase;

require "AddStringNormalizer.php";

class ApmNormalizerManagerTest extends TestCase
{

    public function testBasic() {

        $nm = new ApmNormalizerManager();

        $n1String = '-one';
        $n2String = '-two';
        $n3String = '-three';


        $nm->registerNormalizer('en', 'standard', 'NumberOne', new AddStringNormalizer($n1String));
        $nm->registerNormalizer('en', 'standard', 'NumberTwo', new AddStringNormalizer($n2String));
        $nm->registerNormalizer('en', 'special', 'NumberThree', new AddStringNormalizer($n3String));


        $testToken = new Token(TokenType::WORD, 'test');

        $result1 = $nm->applyNormalizersByLangAndCategory($testToken,'la', 'standard');
        $this->assertCount(1, $result1);
        $this->assertEquals($testToken->getNormalization(), $result1[0]->getNormalization());

        $result2 = $nm->applyNormalizersByLangAndCategory($testToken,'en', 'standard');
        $this->assertCount(1, $result2);
        $token2 = $result2[0];
        $this->assertEquals($testToken->getText() . $n1String . $n2String, $token2->getNormalization());

        $result3 = $nm->applyNormalizerList($testToken, [ 'NumberOne', 'NumberThree']);
        $this->assertCount(1, $result3);
        $token3 = $result3[0];
        $this->assertEquals($testToken->getText() . $n1String . $n3String, $token3->getNormalization());

    }
}