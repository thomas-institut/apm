<?php
/*
 *  Copyright (C) 2021-25 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

namespace ThomasInstitut\FmtText;

use CuyZ\Valinor\Mapper\MappingError;
use DomainException;
use PHPUnit\Framework\TestCase;

/**
 * Tests for {@see FmtTextFactory}.
 *
 * The arrays passed to `fromFmtTextJsonDecodedArray` are crafted to look exactly
 * like the output of `json_decode(JSON.stringify(fmtText), true)` where
 * `fmtText` is a TS `FmtTextToken[]` (see `FmtText.ts`).
 */
class FmtTextFactoryTest extends TestCase
{
    /**
     * @throws MappingError
     */
    public function testFromArrayMinimalTextToken(): void
    {
        $payload = [
            ['type' => 'text', 'text' => 'Hello'],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        $this->assertCount(1, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        /** @var FmtTextTextToken $token */
        $token = $result[0];
        $this->assertSame('Hello', $token->text);
        $this->assertSame(FmtTextTokenType::TEXT, $token->type);
        $this->assertNull($token->fontStyle);
        $this->assertNull($token->fontWeight);
        $this->assertNull($token->verticalAlign);
        $this->assertNull($token->fontSize);
        $this->assertNull($token->classList);
        $this->assertNull($token->textDirection);
    }

    /**
     * @throws MappingError
     */
    public function testFromArrayTextTokenWithAllOptionalFields(): void
    {
        $payload = [
            [
                'type'          => 'text',
                'text'          => 'مرحبا',
                'fontStyle'     => 'italic',
                'fontWeight'    => 'bold',
                'verticalAlign' => 'superscript',
                'fontSize'      => 1.25,
                'classList'     => 'highlight emph',
                'textDirection' => 'rtl',
            ],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        $this->assertCount(1, $result);
        /** @var FmtTextTextToken $token */
        $token = $result[0];
        $this->assertInstanceOf(FmtTextTextToken::class, $token);
        $this->assertSame('مرحبا', $token->text);
        $this->assertSame('italic', $token->fontStyle);
        $this->assertSame('bold', $token->fontWeight);
        $this->assertSame('superscript', $token->verticalAlign);
        $this->assertSame(1.25, $token->fontSize);
        $this->assertSame('highlight emph', $token->classList);
        $this->assertSame('rtl', $token->textDirection);
    }

    /**
     * Integer JSON values for `fontSize` (e.g. `1` instead of `1.0`) must still
     * be accepted because TS produces them whenever the number is a whole.
     *
     * @throws MappingError
     */
    public function testFromArrayTextTokenWithIntegerFontSize(): void
    {
        $payload = [
            ['type' => 'text', 'text' => 'x', 'fontSize' => 2],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        /** @var FmtTextTextToken $token */
        $token = $result[0];
        $this->assertSame(2.0, $token->fontSize);
    }

    /**
     * @throws MappingError
     */
    public function testFromArrayMinimalGlueToken(): void
    {
        $payload = [
            ['type' => 'glue'],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        $this->assertCount(1, $result);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[0]);
        /** @var FmtTextGlueToken $glue */
        $glue = $result[0];
        $this->assertSame(FmtTextTokenType::GLUE, $glue->type);
        $this->assertNull($glue->space);
        $this->assertNull($glue->width);
        $this->assertNull($glue->stretch);
        $this->assertNull($glue->shrink);
    }

    /**
     * @throws MappingError
     */
    public function testFromArrayGlueTokenWithAllFields(): void
    {
        $payload = [
            [
                'type'    => 'glue',
                'space'   => 'normal',
                'width'   => 5.5,
                'stretch' => 2,
                'shrink'  => 1.5,
            ],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        /** @var FmtTextGlueToken $glue */
        $glue = $result[0];
        $this->assertInstanceOf(FmtTextGlueToken::class, $glue);
        $this->assertSame('normal', $glue->space);
        $this->assertSame(5.5, $glue->width);
        $this->assertSame(2.0, $glue->stretch);
        $this->assertSame(1.5, $glue->shrink);
    }

    /**
     * @throws MappingError
     */
    public function testFromArrayMinimalMarkToken(): void
    {
        $payload = [
            ['type' => 'mark', 'markType' => 'paragraph'],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        $this->assertCount(1, $result);
        /** @var FmtTextMarkToken $mark */
        $mark = $result[0];
        $this->assertInstanceOf(FmtTextMarkToken::class, $mark);
        $this->assertSame('paragraph', $mark->markType);
        $this->assertNull($mark->style);
        $this->assertNull($mark->altText);
    }

    /**
     * @throws MappingError
     */
    public function testFromArrayMarkTokenWithAllFields(): void
    {
        $payload = [
            [
                'type'     => 'mark',
                'markType' => 'icon',
                'style'    => 'icon-1',
                'altText'  => '[icon]',
            ],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        /** @var FmtTextMarkToken $mark */
        $mark = $result[0];
        $this->assertInstanceOf(FmtTextMarkToken::class, $mark);
        $this->assertSame('icon', $mark->markType);
        $this->assertSame('icon-1', $mark->style);
        $this->assertSame('[icon]', $mark->altText);
    }

    /**
     * @throws MappingError
     */
    public function testFromArrayEmptyToken(): void
    {
        $payload = [
            ['type' => 'empty'],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        $this->assertCount(1, $result);
        $this->assertInstanceOf(FmtTextEmptyToken::class, $result[0]);
        $this->assertSame(FmtTextTokenType::EMPTY, $result[0]->type);
    }

    /**
     * Representative mixed payload, mimicking what `JSON.stringify` produces
     * for a typical TS `FmtText` made via `newTextToken`/`newGlueToken`/...
     *
     * @throws MappingError
     */
    public function testFromArrayMixedRealisticPayload(): void
    {
        $payload = [
            ['type' => 'text', 'text' => 'Hello'],
            ['type' => 'glue'],
            ['type' => 'text', 'text' => 'world', 'fontWeight' => 'bold'],
            ['type' => 'mark', 'markType' => 'paragraph', 'style' => 'h1'],
            ['type' => 'empty'],
            ['type' => 'text', 'text' => '!', 'textDirection' => 'ltr'],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);

        $this->assertCount(6, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[1]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[2]);
        $this->assertInstanceOf(FmtTextMarkToken::class, $result[3]);
        $this->assertInstanceOf(FmtTextEmptyToken::class, $result[4]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[5]);

        /** @var FmtTextTextToken $t2 */
        $t2 = $result[2];
        $this->assertSame('world', $t2->text);
        $this->assertSame('bold', $t2->fontWeight);

        /** @var FmtTextMarkToken $m */
        $m = $result[3];
        $this->assertSame('paragraph', $m->markType);
        $this->assertSame('h1', $m->style);

        /** @var FmtTextTextToken $t5 */
        $t5 = $result[5];
        $this->assertSame('ltr', $t5->textDirection);
    }

    /**
     * A round-trip simulation: PHP -> json_encode -> json_decode -> factory.
     * This is the closest analogue to the TS-side stringify/decode pipeline.
     *
     * @throws MappingError
     */
    public function testJsonRoundTripFromAssociativeArray(): void
    {
        $tsLikeArray = [
            ['type' => 'text', 'text' => 'Lorem'],
            ['type' => 'glue', 'space' => 'normal'],
            ['type' => 'text', 'text' => 'ipsum', 'fontStyle' => 'italic'],
        ];
        $json = json_encode($tsLikeArray);
        $this->assertIsString($json);
        $decoded = json_decode($json, true);

        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($decoded);
        $this->assertCount(3, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[1]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[2]);
        /** @var FmtTextTextToken $t */
        $t = $result[2];
        $this->assertSame('ipsum', $t->text);
        $this->assertSame('italic', $t->fontStyle);
    }

    /**
     * Empty array maps to empty FmtText.
     *
     * @throws MappingError
     */
    public function testFromArrayEmptyArray(): void
    {
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray([]);
        $this->assertSame([], $result);
    }

    /**
     * Superfluous keys (TS-only fields not modelled in PHP) must be ignored.
     *
     * @throws MappingError
     */
    public function testFromArrayAllowsSuperfluousKeys(): void
    {
        $payload = [
            ['type' => 'text', 'text' => 'hi', 'unknownField' => 'whatever'],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);
        $this->assertCount(1, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
    }

    /**
     * Accepts an explicit empty string for `textDirection` (TS '' variant).
     *
     * @throws MappingError
     */
    public function testFromArrayAcceptsEmptyTextDirection(): void
    {
        $payload = [
            ['type' => 'text', 'text' => 'a', 'textDirection' => ''],
        ];
        $result = FmtTextFactory::fromFmtTextJsonDecodedArray($payload);
        /** @var FmtTextTextToken $t */
        $t = $result[0];
        $this->assertSame('', $t->textDirection);
    }

    public function testFromArrayRejectsInvalidTextDirection(): void
    {
        $payload = [
            ['type' => 'text', 'text' => 'a', 'textDirection' => 'sideways'],
        ];
        try {
            FmtTextFactory::fromFmtTextJsonDecodedArray($payload);
            $this->fail('Expected an exception for invalid textDirection');
        } catch (MappingError $e) {
            // Valinor wraps the DomainException thrown by the custom constructor.
            $this->addToAssertionCount(1);
        } catch (DomainException $e) {
            $this->addToAssertionCount(1);
        }
    }

    public function testFromArrayRejectsUnknownTokenType(): void
    {
        $payload = [
            ['type' => 'unicorn'],
        ];
        $this->expectException(\Throwable::class);
        FmtTextFactory::fromFmtTextJsonDecodedArray($payload);
    }

    // --- fromString -------------------------------------------------------

    public function testFromStringEmpty(): void
    {
        $this->assertSame([], FmtTextFactory::fromString(''));
    }

    public function testFromStringSingleWord(): void
    {
        $result = FmtTextFactory::fromString('hello');
        $this->assertCount(1, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        /** @var FmtTextTextToken $t */
        $t = $result[0];
        $this->assertSame('hello', $t->text);
    }

    public function testFromStringWordsAndSpaces(): void
    {
        $result = FmtTextFactory::fromString('hello world');
        $this->assertCount(3, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[1]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[2]);
        $this->assertSame('hello', $result[0]->text);
        $this->assertSame('world', $result[2]->text);
    }

    public function testFromStringTreatsTabAndNewlineAsGlue(): void
    {
        $result = FmtTextFactory::fromString("a\tb\nc");
        $this->assertCount(5, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[1]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[2]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[3]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[4]);
    }

    public function testFromStringConsecutiveSpacesProduceMultipleGlueTokens(): void
    {
        $result = FmtTextFactory::fromString('a  b');
        // 'a', glue, glue, 'b'
        $this->assertCount(4, $result);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[0]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[1]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[2]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[3]);
    }

    public function testFromStringLeadingAndTrailingSpaces(): void
    {
        $result = FmtTextFactory::fromString(' a ');
        // glue, 'a', glue
        $this->assertCount(3, $result);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[0]);
        $this->assertInstanceOf(FmtTextTextToken::class, $result[1]);
        $this->assertInstanceOf(FmtTextGlueToken::class, $result[2]);
        $this->assertSame('a', $result[1]->text);
    }

    public function testFromStringMultibyte(): void
    {
        $result = FmtTextFactory::fromString('héllo wörld');
        $this->assertCount(3, $result);
        /** @var FmtTextTextToken $t0 */
        $t0 = $result[0];
        /** @var FmtTextTextToken $t2 */
        $t2 = $result[2];
        $this->assertSame('héllo', $t0->text);
        $this->assertSame('wörld', $t2->text);
    }
}
