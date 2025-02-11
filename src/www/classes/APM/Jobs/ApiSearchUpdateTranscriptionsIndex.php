<?php

namespace APM\Jobs;

use APM\System\Job\JobHandlerInterface;
use APM\System\SystemManager;
use APM\CommandLine\IndexManager;

class ApiSearchUpdateTranscriptionsIndex extends ApiSearchUpdateOpenSearchIndex implements JobHandlerInterface
{
    public function run(SystemManager $sm, array $payload): bool
    {
        $logger = $sm->getLogger();
        $config = $sm->getConfig();

        try {
            $this->initializeOpenSearchClient($config);
        } catch (\Exception $e) {
            $logger->debug('Connecting to OpenSearch server failed.');
            return false;
        }

        // Fetch data from payload
        $doc_id = $payload['doc_id'];
        $page = $payload['page'];
        $col = $payload['col'];
        $page_id = $sm->getDocumentManager()->getPageIdByDocPage($doc_id, $page);


        (new IndexManager($config, 0, [0, 'transcriptions', 'update-add', $page_id, $col]))->run();

    }

    public function mustBeUnique(): bool
    {
        return true;
    }

    public function minTimeBetweenSchedules() : int {
        return 2;
    }
}
