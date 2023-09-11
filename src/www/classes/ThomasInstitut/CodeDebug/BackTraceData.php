<?php


namespace ThomasInstitut\CodeDebug;


class BackTraceData
{


    /**
     * @var string
     */
    public $sourceCodeFilename;
    /**
     * @var int
     */
    public $lineNumber;

    public function __construct(string $sourceCodeFilename, int $lineNumber)
    {
        $this->sourceCodeFilename = $sourceCodeFilename;
        $this->lineNumber = $lineNumber;
    }
}