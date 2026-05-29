<?php

namespace APM\Actions;

use APM\System\PublicationManager\PublicationManagerInterface;
use APM\System\PublicationManager\ResourceNotFoundException;
use ThomasInstitut\ApmPublicationApi\PublicationType;
use ThomasInstitut\ApmPublicationApi\TranscriptionData;

readonly class GetTranscriptionDataForDocument
{
    public function __construct(private PublicationManagerInterface $pm)
    {
    }

    /**
     * @throws ResourceNotFoundException
     */
    public function getTranscriptionDataForDocument(int $docId): TranscriptionData
    {
        /** @var TranscriptionData $data */
        $data = $this->pm->createPublication(PublicationType::Transcription, $docId, 'current', true);
        return $data;
    }

}