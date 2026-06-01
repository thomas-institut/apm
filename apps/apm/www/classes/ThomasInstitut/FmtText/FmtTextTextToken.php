<?php

namespace ThomasInstitut\FmtText;

class FmtTextTextToken implements FmtTextToken
{
    public string $type = FmtTextTokenType::TEXT;

    public string $text;
    /**
     * The font style, for example, 'normal' or 'italic'.
     * If empty or undefined, the typesetter will use the default font style.
     */
    public ?string $fontStyle = null;
    /**
     * The font weight, for example, 'normal' or 'bold'.
     * If empty or undefined, the typesetter will use the default font weight.
     */
    public ?string $fontWeight = null;
    /**
     * The text's vertical alignment, for example, 'baseline', 'subscript' or 'superscript'.
     * If empty or undefined, the typesetter will use the default vertical alignment.
     */
    public ?string $verticalAlign = null;
    /**
     * Font size in ems (i.e., relative to a default font size)
     * if empty or undefined, the typesetter will use the default font size (that is,
     * fontSize will be considered to be 1)
     */
    public ?float $fontSize = null;
    /**
     * Space-separated list of strings representing display classes defined in a typesetter.
     */
    public ?string $classList = null;
    /**
     *  The text's direction: 'ltr' or 'rtl'
     */
    public ?string $textDirection = null;
}