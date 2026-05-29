<?php


namespace APM\Core\Transcription;


use APM\Core\Item\ItemWithAddress;

interface Transcription
{
    /**
     * @return ItemWithAddress[]
     */
    public function getItems() : array;

    /**
     * @param $from
     * @param $to
     * @return ItemWithAddress[]
     */
    public function getItemRange($from, $to) : array;

}