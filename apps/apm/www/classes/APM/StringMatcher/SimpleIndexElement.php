<?php

namespace APM\StringMatcher;

/**
 * An element in a simple string index.
 *
 * Each element in the index associates a string of a given type with an id.
 */
class SimpleIndexElement
{
   /**
     * The record's id
     * @var int
     */
    public int $id;

    /**
     * A string that is associated with a particular record id
     * @var string
     */
    public string $theString;
    /**
     * The string type
     * @var string|int
     */
    public string|int $stringType;

    public string $normalizedString;


    public function toTuple() : array {
        return [ $this->id, $this->theString, $this->stringType ];
    }

    public function fromTuple(array $tuple) : self {
        [ $this->id, $this->theString, $this->stringType, $this->normalizedString ] = $tuple;
        return $this;
    }
}