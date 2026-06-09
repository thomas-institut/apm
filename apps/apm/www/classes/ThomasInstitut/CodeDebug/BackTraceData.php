<?php


namespace ThomasInstitut\CodeDebug;


class BackTraceData
{


    /**
     * @var string
     */
    public string $sourceCodeFilename;
    /**
     * @var int
     */
    public int $lineNumber;

    public function __construct(string $sourceCodeFilename, int $lineNumber)
    {
        $this->sourceCodeFilename = $sourceCodeFilename;
        $this->lineNumber = $lineNumber;
    }
}