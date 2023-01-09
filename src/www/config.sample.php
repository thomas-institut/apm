<?php

global $config;

// SUPPORT
$config['support_contact_name'] = 'Rafael Nájera';
$config['support_contact_email'] = 'rafael.najera@uni-koeln.de';

// DATABASE ACCESS
$config['db']['host'] = "localhost";
$config['db']['user'] = "apmadmin";
$config['db']['pwd'] = "REAL_PASSWORD";
$config['db']['db'] = "real_db_name";

// SUB_DIR: APM url after /,
//  e.g. if APM runs in https://test.com/apm,  sub_dir = 'apm'
//       if it runs in https://test.com,  sub_dir = '';
$config['sub_dir'] = '';

// TIME ZONE
$config['default_timezone'] = "Europe/Berlin";

// LOG FILE
$config['log_filename'] = '/path/to/logfile/apm.log';
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


$config['DareImageSource']['BilderbergBaseUrl'] = 'https://oldsire.uni-koeln.de';
$config['DareImageSource']['NewStylePaths'] = true;

$config['DareDeepZoomImageSource']['BilderbergBaseUrl'] = 'https://oldsire.uni-koeln.de';
$config['DareDeepZoomImageSource']['NewStylePaths'] = true;


// Python PDF
$config['pdf-renderer'] = '/installation/path/apm/python/pdf-renderer.py';
$config['pdf-renderer_temp_dir']  = '/path/to/typesetting-tmp';

// Nodejs Typesetter
$config['typesetter'] = 'node /installation/path/node/typesetStdinJson.mjs';


$config['dareApiBaseUri'] = 'https://dare.uni-koeln.de/app/api/db/';

// Opensearch
$config['opensearch_hosts'] = ['https://localhost:9200'];
$config['opensearch_user'] = 'admin';
$config['opensearch_password'] = 'admin';

