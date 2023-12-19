<?php

namespace APM\System\ImageSource;

use APM\System\ImageSource\ImageSourceInterface;

class BilderbergImageSource implements ImageSourceInterface
{

    private string $baseUrl;

    public function __construct(string $bilderbergBaseUrl = '')
    {
        $this->baseUrl = $bilderbergBaseUrl === '' ? 'https://bilderberg.uni-koeln.de' : $bilderbergBaseUrl;
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
            self::IMAGE_TYPE_JPG => sprintf("%s/%s/%d/jpg",
                $this->baseUrl,
                $params[0],
                $params[1]),
            self::IMAGE_TYPE_DEEP_ZOOM => sprintf("%s/%s/%d/DeepZoom",
                $this->baseUrl,
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
        return [ ImageSourceInterface::IMAGE_TYPE_JPG, ImageSourceInterface::IMAGE_TYPE_DEEP_ZOOM];
    }
}