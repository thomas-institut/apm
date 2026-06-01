<?php

namespace ThomasInstitut\FmtText;

class FmtTextMarkToken implements FmtTextToken
{
    public string $type = FmtTextTokenType::MARK;

    /**
     * The type of the mark, for example, 'paragraph', 'footnote', 'icon', 'symbol', etc..
     */
    public string $markType;
    /**
     * The mark's style.
     *
     * For example, a paragraph mark may have a style like 'h1' or 'h2'. An icon
     * might have a style like 'icon-1' or 'icon-2'.
     */
    public ?string $style = null;
    /**
     * Text to show if the visual output cannot produce a correct graphical representation of the mark.
     */
    public ?string $altText = null;
}