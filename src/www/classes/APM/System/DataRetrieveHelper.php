<?php

namespace APM\System;

use APM\System\Document\DocumentManager;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;

class DataRetrieveHelper implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * Returns an array with info by id retrieved by the given callable.
     *
     * It makes sure that the function is only called once per unique id in the list
     *
     *
     * @param array $idList
     * @param callable $getInfoCallable
     * @param bool $callOnIdZero
     * @return array
     */
    public function getInfoFromIdList(array $idList, callable $getInfoCallable, bool $callOnIdZero = false) : array
    {
        $infoArray = [];
        foreach($idList as $id) {
            if (!$callOnIdZero and $id===0) {
                continue;
            }
            if (!isset($infoArray[$id])) {
                $infoArray[$id] = call_user_func($getInfoCallable, $id);
            }
        }
        return $infoArray;
    }

    /**
     * @param array $docList
     * @param DocumentManager $docManager
     * @return array
     */
    public function getDocInfoArrayFromList(array $docList, DocumentManager $docManager) : array {
        return $this->getInfoFromIdList(
            $docList,
            function ($id) use ($docManager) {
                return $docManager->getDocInfo($id);
            }
        );
    }


}