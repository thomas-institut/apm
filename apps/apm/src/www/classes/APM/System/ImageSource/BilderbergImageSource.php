<?php

namespace APM\System\ImageSource;

use APM\System\ApmImageType;

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
            ApmImageType::IMAGE_TYPE_JPG => sprintf("%s/%s/%d/jpg",
                $this->baseUrl,
                $params[0],
                $params[1]),
            ApmImageType::IMAGE_TYPE_DEEP_ZOOM => sprintf("%s/%s/%d/DeepZoom",
                $this->baseUrl,
                $params[0],
                $params[1]),
            ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL =>  sprintf("%s/%s/%d/thumbnail",
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
        return [ ApmImageType::IMAGE_TYPE_JPG, ApmImageType::IMAGE_TYPE_DEEP_ZOOM, ApmImageType::IMAGE_TYPE_JPG_THUMBNAIL];
    }
}