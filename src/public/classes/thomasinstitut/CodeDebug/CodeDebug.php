<?php


namespace ThomasInstitut\CodeDebug;

use PHPUnit\Framework\StaticAnalysis\HappyPath\AssertNotInstanceOf\B;

/**
 * Class CodeDebug
 * @package ThomasInstitut\CodeDebug
 *
 * @codeCoverageIgnore
 */
class CodeDebug
{
    static public function getBackTraceData(int $fileNameDepth) : BackTraceData {
        $backTrace = debug_backtrace();
        array_shift($backTrace); // first in array is trait function that called this function
        $caller = array_shift($backTrace);  // this is the caller we're interested in
        $sourceCodeFilename = $caller['file'];
        if ($fileNameDepth > 0) {
            $parts = explode('/', $sourceCodeFilename);
            if (count($parts) > $fileNameDepth) {
                $goodParts = array_slice($parts,count($parts)-$fileNameDepth, $fileNameDepth);
                $sourceCodeFilename = implode('/', $goodParts);
            }
        }
        $line = $caller['line'];

        return new BackTraceData($sourceCodeFilename, $line);
    }
}