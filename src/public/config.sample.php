<?php

// SUPPORT
$config['support_contact_name'] = '<CONTACT>';
$config['support_contact_email'] = '<CONTACT_EMAIL>';

// DATABASE ACCESS
$config['db']['host'] = "HOST";
$config['db']['user'] = "USER";
$config['db']['pwd'] = "PASSWORD";
$config['db']['db'] = "DATABASE";

// BASE URL  (do not add trailing slashes, e.g. https://mywebsite.com/ is wrong, use https://mywebsite.com)
$config['baseurl'] = 'http://localhost:8888/public';

// TIME ZONE
$config['default_timezone'] = "Europe/Berlin";

// LOG FILE
$config['log_filename'] = '/var/log/apm/apm.log';
$config['log_include_debug_info'] = true;
$config['log_in_php_error_handler'] = true;

// LANGUAGES
$config['languages'] = [
    [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
    [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
    [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3], 
    [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3] 
];

// COLLATION ENGINE
$config['collation_engine'] = 'Collatex';
//$config['collation_engine'] = 'DoNothing';

// COLLATEX
$config['collatex_temp_dir'] = 'collatex/tmp';
$config['java_executable'] = '/usr/bin/java';


// IMAGE SOURCE PLUGINS

$config['plugins'][] = 'LocalImageSource';
$config['plugins'][] = 'DareImageSource';
$config['plugins'][] = 'DareDeepZoomImageSource';
$config['plugins'][] = 'AverroesServerImageSource';

