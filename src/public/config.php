<?php
$config['db']['host'] = "localhost";
$config['db']['user'] = "admin";
$config['db']['pwd'] = "p7kir7";
$config['db']['db'] = "averroes";

$config['baseurl']='http://localhost:8888/public';

$config['tables'] = array();
$config['tables']['settings']   = 'ap_settings';
$config['tables']['ednotes']    = 'ap_ednotes';
$config['tables']['elements']   = 'ap_elements';
$config['tables']['items']      = 'ap_items';
$config['tables']['hands']      = 'ap_hands';
$config['tables']['users']      = 'ap_users';
$config['tables']['docs']       = 'ap_docs';
$config['tables']['people']     = 'ap_people';

// slim error handling
// ATTENTION: set to false in production
$config['displayErrorDetails'] = true;


