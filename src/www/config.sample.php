<?php
/**
 * Configuration file for the APM
 */

use APM\System\ApmConfigParameter as ConfigParam;

global $config;

// TIME ZONE
$config[ConfigParam::DEFAULT_TIMEZONE] = "Europe/Berlin";

// DATABASE ACCESS
$config[ConfigParam::DB]['host'] = "localhost";
$config[ConfigParam::DB]['user'] = "xxxx";
$config[ConfigParam::DB]['pwd'] = "xxxx";
$config[ConfigParam::DB]['db'] = "apm";
$config[ConfigParam::DB_TABLE_PREFIX] = 'ap_';

// SUB_DIR: APM url after /,
//  e.g. if APM runs in https://test.com/apm,  sub_dir = 'apm'
//       if it runs in https://test.com,  sub_dir = '';
$config[ConfigParam::SUB_DIR] = '';

// APM DAEMON
$config[ConfigParam::APM_DAEMON_PID_FILE] = '/path/to/apmd.pid';

// LOG FILE
$config[ConfigParam::LOG_FILENAME] = '/path/to/apm.log';
$config[ConfigParam::LOG_INCLUDE_DEBUG_INFO] = true;
$config[ConfigParam::LOG_IN_PHP_ERROR_HANDLER] = true;

// OPENSEARCH ACCESS
$config[ConfigParam::OPENSEARCH_HOSTS] = ['https://localhost:9200'];
$config[ConfigParam::OPENSEARCH_USER] = 'admin';
$config[ConfigParam::OPENSEARCH_PASSWORD] = 'admin';

// TMP directory locations
$config[ConfigParam::COLLATEX_TEMP_DIR] = '/path/to/tmp';
$config[ConfigParam::PDF_RENDERER_TEMP_DIR]  = '/path/to/typesetting-tmp';

// JAVA
$config[ConfigParam::JAVA_EXECUTABLE] = '/usr/bin/java';

// COMMAND LINE UTILITIES
$config[ConfigParam::AUTHORIZED_COMMAND_LINE_USERS] = [ 'theuser'];

// BILDERBERG
//
//$config[ConfigParam::BILDERBERG_URL] = 'http://localhost:7777';

// Site App Options
$config[ConfigParam::SITE_SHOW_LANGUAGE_SELECTOR] = true;
$config[ConfigParam::TWIG_USE_CACHE] = false;



