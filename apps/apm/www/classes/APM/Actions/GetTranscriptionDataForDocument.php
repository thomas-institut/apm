<?php

namespace APM\Actions;

use APM\System\PublicationManager\PublicationManager;
use APM\System\PublicationManager\ResourceNotFoundException;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;

readonly class GetTranscriptionDataForDocument
{
    public function __construct(private PublicationManager $pm)
    {
    }

    /**
     * @throws ResourceNotFoundException
     */
    public function getTranscriptionDataForDocument(int $docId): TranscriptionData
    {
        /** @var TranscriptionData $data */
        $data = $this->pm->createPublication(PublicationType::Transcription->value, $docId, 'current', true);
        return $data;
    }

}