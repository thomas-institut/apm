<?php

namespace APM\EntitySystem\Schema;


const ImageSourcesDefinitions = [

    [
        Entity::ImageSourceBilderberg,
        'Bilderberg',
        'Images stored in the Bilderberg system',
        [],
        [],
        false, // not deprecated
        ''
    ],
    [
        Entity::ImageSourceAverroesServer,
        'Averroes Server',
        'Images stored in the Averroes server',
        [],
        [],
        false, // not deprecated
        ''
    ],


];


use APM\EntitySystem\Kernel\DefsFromArray;
use APM\EntitySystem\Kernel\EntityDefiner;

class ImageSources implements EntityDefiner
{


    /**
     * @inheritDoc
     */
    public function getEntityDefinitions(): array
    {
        return DefsFromArray::getEntityDefinitionsFromArray(ImageSourcesDefinitions, Entity::tImageSource);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(): array
    {
        return [];
    }
}