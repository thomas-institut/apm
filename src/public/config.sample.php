<?php
/**
 * Sample configuration file
 * 
 * Edit with your production or development parameters
 * 
 */
$config['db']['host'] = "localhost";
$config['db']['user'] = "MYSQL USER";
$config['db']['pwd'] = "PASSWORD";
$config['db']['db'] = "THE DATABASE";

// This is fine for development with the PHP server
$config['baseurl']='http://localhost:8888/public';

/// For production it should be something like this:
//$config['baseurl']='http://somehost.com/somesubdir';

// slim error handling
// ATTENTION: set to false in production
$config['displayErrorDetails'] = true;

// Log file name (relative to the location of the web base)
$config['logfilename'] = 'log/apm.log';


$config['languages'] = [
    [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
    [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
    [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3], 
    [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3] 
];

$config['langCodes'] = [];
foreach ($config['languages'] as $lang) {
    $config['langCodes'][] = $lang['code'];
}


// Collatex

$config['collatex']['tmp'] = '/tmp';
$config['collatex']['javaExecutable'] = '/usr/bin/java';