<?php

namespace APM\System;

interface LanguageManager
{
    public function getLanguageCode(int $langId) : string|null;

}