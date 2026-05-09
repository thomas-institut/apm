<?php

namespace APM\CommandLine\DataGrabber;

use APM\EntitySystem\ApmEntitySystemInterface;

class DataGrabberUtil
{

    /**
     * Returns an array with all valid tids in the argument array, starting with the given index.
     *
     * If  the word 'all' is found in the starting index, all entities of the given type are returned.
     *
     * Ignores the word 'doIt' in the arguments (which otherwise would result in a valid Tid)
     *
     * @param ApmEntitySystemInterface $es
     * @param array $argv
     * @param array|null $wordsToIgnore
     * @return array
     */
    static public function getTidsFromArgv(ApmEntitySystemInterface $es, array $argv, array $wordsToIgnore = null) : array {

        if ($wordsToIgnore === null) {
            $wordsToIgnore = ['doIt', 'all'];
        }


        $tids = [];
        for($i  = 0; $i < count($argv); $i++) {
            $arg = $argv[$i];
            if ($arg === 'doIt') {
                continue;
            }
            $tid = $es->getEntityIdFromString($arg);
            if ($tid !== -1) {
                $tids[] = $tid;
            }
        }
        return $tids;
    }
}