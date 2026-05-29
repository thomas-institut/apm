<?php

namespace APM\System\Config;

class LogConfig
{
    public string $appName = 'APM';
    public bool $includeDebugInfo = false;
    public string $fileName = '';
    public bool $inPhpErrorHandler = false;

    /**
     * If set, the log will be written to stderr for CLI utilities
     */
    public bool $inStdErr = true;
}