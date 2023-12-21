<?php

namespace APM\System\ImageSource;

use APM\System\ApmImageType;
use APM\System\ImageSource\ImageSourceInterface;

class OldBilderbergStyleRepository implements ImageSourceInterface
{


    private string $baseUrl;

    public function __construct(string $baseUrl)
    {
        $this->baseUrl = $baseUrl;
    }

    /**
     * @inheritDoc
     */
    public function getImageUrl(string $type, ...$params): string
    {
        if (count($params) !== 2) {
            throw new \InvalidArgumentException("Need document id and image number");
        }
        return match ($type) {
            ApmImageType::IMAGE_TYPE_JPG => sprintf( "%s/%s/%s-%04d.jpg",
                $this->baseUrl,
                $params[0],
                $params[0],
                $params[1]),
            default => '',
        };
    }

    /**
     * @inheritDoc
     */
    public function getSupportedImageTypes(): array
    {
        return [ ApmImageType::IMAGE_TYPE_JPG];
    }
}