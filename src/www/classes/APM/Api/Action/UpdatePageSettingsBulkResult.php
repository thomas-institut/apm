<?php

namespace APM\Api\Action;

/**
 * Result of a bulk page settings update operation.
 */
readonly class UpdatePageSettingsBulkResult
{
    /**
     * @param list<int> $updatedPageIds Page IDs that were successfully updated
     * @param list<string> $errors Error messages for pages that failed
     */
    public function __construct(
        public array $requestedPageIds,
        public array $updatedPageIds,
        public array $errors,
    ) {}

    public function hasErrors(): bool
    {
        return count($this->errors) > 0;
    }
}