<?php
/**
 * Sample configuration file
 * 
 * All entries are required.
 * 
 * Edit and save to config.php
 * 
 */

// SUPPORT
$config['support-contact-name'] = 'John Doe';
$config['support-contact-email'] = 'john@doe.com';

// DATABASE ACCESS
$config['db']['host'] = "localhost";
$config['db']['user'] = "MYSQL USER";
$config['db']['pwd'] = "PASSWORD";
$config['db']['db'] = "THE DATABASE";

// BASE URL
$config['baseurl']='http://localhost:8888/public';

// TIME ZONE
$config['default_timezone'] = "Europe/Berlin";

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


// PLUGINS
// a plugin named 'PluginName' must be implemented as
// a class with the fully qualified name '\PluginName' and its
// code must reside in  ./plugins/PluginName.php

$config['plugins'][] = 'LocalImageSource';
$config['plugins'][] = 'DareImageSource';
$config['plugins'][] = 'DareDeepZoomImageSource';
$config['plugins'][] = 'AverroesServerImageSource';