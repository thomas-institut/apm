<?php

namespace APM\System\Config;

final readonly class LogConfig
{
    public function __construct(
        public string $appName = 'APM',
        public bool   $includeDebugInfo = false,
        public string $fileName = '',
        public bool   $inPhpErrorHandler = false,
        /**
         * If set, the log will be written to stderr for CLI utilities
         */
        public bool   $inStdErr = true
    )
    {
    }
}