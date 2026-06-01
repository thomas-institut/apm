<?php

namespace ThomasInstitut\FmtText;

/**
 * A glue token.
 *
 * The term 'glue' is taken from Donald Knuth's "The TeX book", where it is explained in
 * chapter 12.
 *
 * Glue is meant to represent a potentially variable-length space that may or
 * may not eventually appear in a representation of the text. It may not appear, for example, in
 * a printed version of the text if it is an inter-word space that falls at the end of the line.
 * This allows for more sophisticated typesetting in printed form.
 */
class FmtTextGlueToken implements FmtTextToken
{
    public string $type = FmtTextTokenType::GLUE;
    /**
     * A string that a typesetter may interpret as a style or kind of space, for example, 'normal' or 'em',
     * in case a width is not specified.
     */
    public ?string $space = null;
    /**
     * The glue base width in pixels.
     *
     * If negative or undefined, defaults to a standard width or to the style given in ``space``
     */
    public ?float $width = null;
    /**
     * Extra pixels the space can stretch to.
     *
     * This is only a suggestion, the typesetting algorithm may stretch spaces more than this in extreme
     * situations.
     */
    public ?float $stretch = null;
    /**
     * How many pixels less the space can have. This allows the typesetter to make lines more compact to
     * a certain extent.
     *
     * ``space - shrink`` is the absolute minimum for the space
     */
    public ?float $shrink = null;
}