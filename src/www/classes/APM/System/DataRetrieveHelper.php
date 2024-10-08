<?php

namespace APM\System;

use APM\FullTranscription\DocManager;
use APM\FullTranscription\PageManager;
use APM\System\Person\PersonManagerInterface;
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
                $infoArray[$id] = $getInfoCallable($id);
            }
        }
        return $infoArray;
    }

    public function getPageInfoArrayFromList(array $pageList, PageManager $pageManager) : array {
        return $this->getInfoFromIdList(
            $pageList,
            function ($id) use ($pageManager) {
                return $pageManager->getPageInfoById($id);
            }
        );
    }

    public function getDocInfoArrayFromList(array $docList, DocManager $docManager) : array {
        return $this->getInfoFromIdList(
            $docList,
            function ($id) use ($docManager) {
                return $docManager->getDocInfoById($id);
            }
        );
    }



    public function getAuthorInfoArrayFromList(array $authorList, PersonManagerInterface $personManager) : array {
        return $this->getInfoFromIdList(
            $authorList,
            function ($tid) use ($personManager) {
                try {
                    $personData = $personManager->getPersonEssentialData($tid);
                    return [ 'tid' => $tid, 'name' => $personData->name];
                } catch (Person\PersonNotFoundException $e) {
                    return [ 'tid' => $tid, 'name' => "Unknown P-$tid}"];
                }
            }
        );
    }


}