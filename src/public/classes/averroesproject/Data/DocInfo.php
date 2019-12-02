<?php


namespace AverroesProject\Data;

/**
 *
 * Data stored about a document in the database
 *
 */
class DocInfo
{

    /**
     * @var int
     */
    public $id = 0;

    /**
     * @var string
     */
    public $title = '';

    /**
     * @var string
     */
    public $shortTitle = '';

    /**
     * @var string
     */
    public $lang = '';

    /**
     * @var string
     */
    public $docType = '';

    /**
     * @var string
     */
    public $imageSource = '';

    /**
     * @var string
     */
    public $imageSourceData = '';

}