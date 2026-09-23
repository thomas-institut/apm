<?php

namespace APM\System\Events;

/**
 * Payload for an updated transcription.
 */
final readonly class TranscriptionUpdatedPayload
{

    /**
     * Create a transcription update payload.
     *
     * @param int $userTid User entity ID that made the update.
     * @param int $docId Document entity ID.
     * @param int $pageNumber Page number within the document.
     * @param int $columnNumber Column number within the page.
     */
    public function __construct(
        public int $userTid,
        public int $docId,
        public int $pageNumber,
        public int $columnNumber
    ) {
    }
}