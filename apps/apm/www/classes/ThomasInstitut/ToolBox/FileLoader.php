<?php

namespace ThomasInstitut\ToolBox;

class FileLoader
{

    /**
     * Goes over a list of file names and returns the contents of the first
     * one that exists, or null if no file was found
     *
     * @param array $fileNames
     * @return string|null
     */
    public static function fileGetContents(array $fileNames) : string|null {
        for ($i = 0; $i < count($fileNames); $i++) {
            $filePath = $fileNames[$i];
            if (file_exists($filePath)) {
                $fileContents = file_get_contents($filePath);
                if ($fileContents !== false) {
                    return $fileContents;
                }
            }
        }
        return null;
    }
}