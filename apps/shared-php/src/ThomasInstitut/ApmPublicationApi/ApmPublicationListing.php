<?php

namespace ThomasInstitut\ApmPublicationApi;

use ThomasInstitut\Settable\FromFlatArrayTrait;
use ThomasInstitut\Settable\SettableFromArray;

class ApmPublicationListing implements SettableFromArray
{

    use FromFlatArrayTrait;

    /**
     * A string identifying the publication's type: 'transcription', 'edition', etc.
     * @var string
     */
    public string $type;
    /**
     * The publication's id in APM
     *
     * Identifies a published resource. Querying APM for this id will return the publication's data for
     * the current version.
     *
     * @var int
     */
    public int $id;

    /**
     * The publication's version time string. Example: 2023-01-01 00:00:00.123456
     *
     * A change in this value means that the resource has changed and presenter apps should query APM for the latest version
     *
     * @var string
     */
    public string $versionTimeString;

    /**
     * The publication's title.
     *
     * APM can change this at any time, but a different title does not necessarily mean that the publication has changed.
     * @var string
     */
    public string $title;

    /**
     * The publication's description.
     *
     * APM can change this at any time, but a different description does not necessarily mean that the publication has changed.
     * @var string
     */
    public string $description;
}