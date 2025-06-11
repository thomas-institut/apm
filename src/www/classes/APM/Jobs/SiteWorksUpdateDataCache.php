<?php

namespace APM\Jobs;

use APM\Site\SiteWorks;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TxText\ChunkMark;
use APM\ToolBox\ArrayComp;
use ThomasInstitut\DataTable\InvalidTimeStringException;

class SiteWorksUpdateDataCache implements JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {

        if (isset($payload['type']) && $payload['type'] == 'transcription'){
            // check that the updated transcription actually updates anything regarding works
            $vm = $sm->getTranscriptionManager()->getColumnVersionManager();
            $docId = $payload['docId'] ?? null;
            $pageNumber = $payload['pageNumber'] ?? null;
            $columnNumber = $payload['columnNumber'] ?? null;

            if ($docId === null || $pageNumber === null || $columnNumber === null){
                $sm->getLogger()->error("Incorrect payload for job '$jobName': invalid transcription data", $payload);
                return false;
            }

            try {
                $pageInfo  = $sm->getTranscriptionManager()->getPageInfoByDocPage($docId, $pageNumber);
                $versions = $vm->getColumnVersionInfoByPageCol($pageInfo->pageId, $columnNumber, 2);

                $transcriptions = [];
                foreach ($versions as $version){
                    $transcriptions[] = $sm->getTranscriptionManager()->getColumnElementsByPageId(
                        $version->pageId,
                        $columnNumber,
                        $version->timeFrom
                    );
                }
                $works = $this->getWorksMentioned($transcriptions[0]);
                if (count($transcriptions) === 1 && count($works) === 0){
                    // nothing to do!
                    $sm->getLogger()->debug(
                        "Job '$jobName': no works referenced in new transcription for $docId:$pageNumber:$columnNumber, nothing to do");
                    return true;
                }
                $worksNew = $this->getWorksMentioned($transcriptions[1]);

                if (ArrayComp::areEqual($works, $worksNew)){
                    // nothing to do!
                    $sm->getLogger()->debug(
                        "Job '$jobName': no work related changes found in updated transcription for $docId:$pageNumber:$columnNumber, nothing to do");
                    return true;
                }
            } catch (DocumentNotFoundException|PageNotFoundException $e) {
                // report the error and return
                $sm->getLogger()->error("Incorrect payload for job '$jobName': " . $e->getMessage());
                return false;
            } catch (InvalidTimeStringException $e) {
                // should never happen
                $sm->getLogger()->error("Invalid time string for job '$jobName': " . $e->getMessage());
                return false;
            }
        }
        return SiteWorks::updateCachedWorkData($sm);
    }


    /**
     * @param Element[] $elementArray
     * @return string[]
     */
    private function getWorksMentioned(array $elementArray) : array {
        $works = [];
        foreach ($elementArray as $element){
            foreach ($element->items as $item){
                if (is_a($item, ChunkMark::class)){
                    /** @var ChunkMark $item */
                    $works[] = $item->getDareId();
                }
            }
        }
        $works = array_unique($works);
        sort($works);
        return $works;
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}