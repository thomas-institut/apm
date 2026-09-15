<?php

namespace APM\System\Actions\UpdatePageSettingsBulk;

final readonly class UpdatePageSettingsBulkPayload
{

    public function __construct(
        public array $pageDefinitions,
        public int $userId
    )
    {
    }
}