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
