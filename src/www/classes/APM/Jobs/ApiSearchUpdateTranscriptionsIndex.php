<?php

namespace APM\Jobs;

use APM\CommandLine\IndexManager;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Document\Exception\PageNotFoundException;
use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use Http\Client\Exception;
use ThomasInstitut\DataTable\InvalidTimeStringException;
use Typesense\Exceptions\TypesenseClientError;

class ApiSearchUpdateTranscriptionsIndex extends ApiSearchUpdateTypesenseIndex implements JobHandlerInterface
{
    /**
     * @param SystemManager $sm
     * @param array $payload
     * @return bool
     * @throws DocumentNotFoundException
     * @throws PageNotFoundException
     * @throws Exception
     * @throws TypesenseClientError
     */
    public function run(SystemManager $sm, array $payload, string $jobName): bool
    {

        $config = $sm->getConfig();

        // Fetch data from payload
        $docId = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];
        $pageId = $sm->getDocumentManager()->getPageIdByDocPage($docId, $page);

        $im = new IndexManager($config, 0, []);
        $im->setIndexNamePrefix('transcriptions');


        try {
            $im->updateOrAddItem($pageId, $col);
            return true;
        } catch (EntityDoesNotExistException|DocumentNotFoundException|PageNotFoundException|InvalidTimeStringException $e) {
            $sm->getLogger()->error("Error updating transcription index for page $pageId col $col: " . $e->getMessage());
            return false;
        }
    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
