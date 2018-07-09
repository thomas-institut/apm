<?php
/**
 * Sample configuration file
 * 
 * All entries are required.
 * 
 * Edit and save to config.php
 * 
 */

// DATABASE ACCESS
$config['db']['host'] = "localhost";
$config['db']['user'] = "MYSQL USER";
$config['db']['pwd'] = "PASSWORD";
$config['db']['db'] = "THE DATABASE";

// TABLE NAME PREFIX
$config['db']['tablePrefix'] = 'ap_';

// BASE URL
$config['baseurl']='http://localhost:8888/public';

// SLIM ERROR HANDLING
// Might be set to false in production
$config['displayErrorDetails'] = true;

// LOG FILE  
// The web server user should be able to create and write to the given file
$config['logfilename'] = '/var/log/apm/apm.log';


// LANGUAGES
$config['languages'] = [
    [ 'code' => 'ar', 'name' => 'Arabic', 'rtl' => true, 'fontsize' => 5],
    [ 'code' => 'jrb', 'name' => 'Judeo Arabic', 'rtl' => true, 'fontsize' => 3],
    [ 'code' => 'he', 'name' => 'Hebrew', 'rtl' => true, 'fontsize' => 3], 
    [ 'code' => 'la', 'name' => 'Latin', 'rtl' => false, 'fontsize' => 3] 
];

// COLLATEX
$config['collatex']['tmp'] = 'collatex/tmp';
$config['collatex']['javaExecutable'] = '/usr/bin/java';