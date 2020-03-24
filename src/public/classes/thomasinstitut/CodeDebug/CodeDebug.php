<?php


namespace ThomasInstitut\CodeDebug;

/**
 * Class CodeDebug
 * @package ThomasInstitut\CodeDebug
 *
 * @codeCoverageIgnore
 */
class CodeDebug
{
    static public function getBackTraceData(int $fileNameDepth) : array {
        $backTrace = debug_backtrace();
        $caller = array_shift($backTrace);
        $sourceCodeFilename = $caller['file'];
        if ($fileNameDepth > 0) {
            $parts = explode('/', $sourceCodeFilename);
            if (count($parts) > $fileNameDepth) {
                $goodParts = array_slice($parts,count($parts)-$fileNameDepth, $fileNameDepth);
                $sourceCodeFilename = implode('/', $goodParts);
            }
        }
        $line = $caller['line'];

        return [ 'sourceCodeFileName' => $sourceCodeFilename, 'line' => $line];
    }
}