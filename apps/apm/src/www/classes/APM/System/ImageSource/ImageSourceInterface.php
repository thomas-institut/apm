<?php

namespace APM\System\ImageSource;

interface ImageSourceInterface
{

    /**
     * Returns an image url of the required type or an empty
     * string if the type is not supported by the source.
     *
     * @param string $type
     * @param mixed ...$params
     * @return string
     */
    public function getImageUrl(string $type, ...$params) : string;


    /**
     * @return string[]
     */
    public function getSupportedImageTypes() : array;


}