<?php

namespace ThomasInstitut\FmtText;

use CuyZ\Valinor\Mapper\MappingError;
use CuyZ\Valinor\MapperBuilder;

class FmtTextFactory
{
    /**
     * Builds an array of FmtTextToken objects from a plain string.
     *
     * Replicates the behaviour of `fromString` in `FmtText.ts`: every run of
     * non-whitespace characters becomes a text token, and every whitespace
     * character (space, newline, tab) becomes a glue token.
     *
     * @param string $str
     * @return array<FmtTextToken>
     */
    public static function fromString(string $str): array
    {
        $fmtText = [];
        $currentWord = '';
        $length = mb_strlen($str);
        for ($i = 0; $i < $length; $i++) {
            $char = mb_substr($str, $i, 1);
            if ($char === ' ' || $char === "\n" || $char === "\t") {
                if ($currentWord !== '') {
                    $textToken = new FmtTextTextToken();
                    $textToken->text = $currentWord;
                    $fmtText[] = $textToken;
                    $currentWord = '';
                }
                $fmtText[] = new FmtTextGlueToken();
            } else {
                $currentWord .= $char;
            }
        }
        if ($currentWord !== '') {
            $textToken = new FmtTextTextToken();
            $textToken->text = $currentWord;
            $fmtText[] = $textToken;
        }
        return $fmtText;
    }

    /**
     * Builds an array of FmtTextToken objects from a JSON-decoded array
     * (i.e., the structure produced by `JSON.stringify(fmtText)` on the TS side).
     *
     * @param array $jsonDecodedArray
     * @return array<FmtTextToken>
     * @throws MappingError
     */
    public static function fromFmtTextJsonDecodedArray(array $jsonDecodedArray): array
    {
        $inferFmtTextTokenClass =
            /**
             * @param string $type
             * @return class-string<FmtTextTextToken|FmtTextGlueToken|FmtTextMarkToken|FmtTextEmptyToken>
             */
            static fn (string $type): string => match ($type) {
                FmtTextTokenType::TEXT  => FmtTextTextToken::class,
                FmtTextTokenType::GLUE  => FmtTextGlueToken::class,
                FmtTextTokenType::MARK  => FmtTextMarkToken::class,
                FmtTextTokenType::EMPTY => FmtTextEmptyToken::class,
            };

        return (new MapperBuilder())
            ->infer(FmtTextToken::class, $inferFmtTextTokenClass)
            ->registerConstructor(
            /**
             * Custom constructor for FmtTextTextToken that validates `textDirection`.
             *
             * @param string $text
             * @param string|null $fontStyle
             * @param string|null $fontWeight
             * @param string|null $verticalAlign
             * @param float|null $fontSize
             * @param string|null $classList
             * @param string|null $textDirection
             * @return FmtTextTextToken
             */
                function (
                    string $text,
                    ?string $fontStyle = null,
                    ?string $fontWeight = null,
                    ?string $verticalAlign = null,
                    ?float $fontSize = null,
                    ?string $classList = null,
                    ?string $textDirection = null,
                ): FmtTextTextToken {
                    if (!TextDirection::isValid($textDirection)) {
                        throw new \DomainException(
                            "Invalid textDirection '$textDirection': must be '', 'ltr' or 'rtl'."
                        );
                    }
                    $token = new FmtTextTextToken();
                    $token->text = $text;
                    $token->fontStyle = $fontStyle;
                    $token->fontWeight = $fontWeight;
                    $token->verticalAlign = $verticalAlign;
                    $token->fontSize = $fontSize;
                    $token->classList = $classList;
                    $token->textDirection = $textDirection;
                    return $token;
                }
            )
            ->allowSuperfluousKeys()
            ->mapper()
            ->map('array<' . FmtTextToken::class . '>', $jsonDecodedArray);
    }
}
