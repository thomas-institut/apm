<?php


namespace AverroesProject\Data;

/**
 *
 * Data stored about a document in the database
 *
 */
class DocInfo
{


    public int $id = 0;
    public int $tid = 0;
    public string $title = '';
    public string $shortTitle = '';
    public string $lang = '';
    public string $docType = '';
    public string $imageSource = '';
    public string $imageSourceData = '';

}