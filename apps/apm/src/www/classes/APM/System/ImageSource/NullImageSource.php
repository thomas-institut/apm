<?php

namespace APM\System\ImageSource;


class NullImageSource implements ImageSourceInterface
{

    /**
     * @inheritDoc
     */
    public function getImageUrl(string $type, ...$params): string
    {
        return '';
    }

    /**
     * @inheritDoc
     */
    public function getSupportedImageTypes(): array
    {
       return [];
    }
}