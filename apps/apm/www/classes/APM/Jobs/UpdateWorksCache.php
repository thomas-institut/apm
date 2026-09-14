<?php

namespace APM\Jobs;

use APM\CollationTable\CollationTableManager;
use APM\Site\SiteWorks;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\SystemManager;
use APM\System\Transcription\ColumnElement\Element;
use APM\System\Transcription\TranscriptionManager;
use APM\System\Transcription\TxText\ChunkMark;
use APM\System\Work\WorkManager;
use APM\ToolBox\ArrayComp;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\Exception\InvalidTimeStringException;
use ThomasInstitut\JobQueue\JobHandlerInterface;

readonly class UpdateWorksCache implements JobHandlerInterface
{
    public function __construct(private ContainerInterface $ci) {}

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function run(array $payload, string $jobName): bool
    {
        $transcriptionManager = $this->ci->get(TranscriptionManager::class);
        $logger = $this->ci->get(LoggerInterface::class);

        if (isset($payload['type']) && $payload['type'] == 'transcription'){
            // check that the updated transcription actually updates anything regarding works
            $vm = $transcriptionManager->getColumnVersionManager();
            $docId = $payload['docId'] ?? null;
            $pageNumber = $payload['pageNumber'] ?? null;
            $columnNumber = $payload['columnNumber'] ?? null;

            if ($docId === null || $pageNumber === null || $columnNumber === null){
                $logger->error("Incorrect payload for job '$jobName': invalid transcription data", $payload);
                return false;
            }

            try {
                $pageInfo  = $transcriptionManager->getPageInfoByDocPage($docId, $pageNumber);
                $versions = $vm->getColumnVersionInfoByPageCol($pageInfo->pageId, $columnNumber, 2);

                $transcriptions = [];
                foreach ($versions as $version){
                    $transcriptions[] = $transcriptionManager->getColumnElementsByPageId(
                        $version->pageId,
                        $columnNumber,
                        $version->timeFrom
                    );
                }
                $works = count($transcriptions) !== 0 ? $this->getWorksMentioned($transcriptions[0]) : [];
                if (count($transcriptions) === 1 && count($works) === 0){
                    // nothing to do!
                    $logger->debug(
                        "Job '$jobName': no works referenced in new transcription for $docId:$pageNumber:$columnNumber, nothing to do");
                    return true;
                }
                $worksNew = $this->getWorksMentioned($transcriptions[1]);

                if (ArrayComp::areEqual($works, $worksNew)){
                    // nothing to do!
                    $logger->debug(
                        "Job '$jobName': no work related changes found in updated transcription for $docId:$pageNumber:$columnNumber, nothing to do");
                    return true;
                }
            } catch (DocumentNotFoundException|PageNotFoundException $e) {
                // report the error and return
                $logger->error("Incorrect payload for job '$jobName': " . $e->getMessage());
                return false;
            } catch (InvalidTimeStringException $e) {
                // should never happen
                $logger->error("Invalid time string for job '$jobName': " . $e->getMessage());
                return false;
            }
        }
        $collationTableManager = $this->ci->get(CollationTableManager::class);
        $systemMainDataCache = $this->ci->get(SystemMainDataCache::class);
        $workManager = $this->ci->get(WorkManager::class);
        return SiteWorks::updateCachedWorkData($collationTableManager, $transcriptionManager, $workManager, $systemMainDataCache, $logger);
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