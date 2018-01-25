<?php
/**
 * Sample DB configuration for test environment
 * 
 * Edit with your database info
 */
$config['host'] = "localhost";
$config['user'] = "<DB user>";
$config['pwd'] = "<DB PASSWORD";
$config['db'] = "<DATABASE>";


$config['tables'] = [];
$config['tables']['settings']   = 'ap_settings';
$config['tables']['ednotes']    = 'ap_ednotes';
$config['tables']['elements']   = 'ap_elements';
$config['tables']['items']      = 'ap_items';
$config['tables']['hands']      = 'ap_hands';
$config['tables']['users']      = 'ap_users';
$config['tables']['relations']  = 'ap_relations';
$config['tables']['docs']       = 'ap_docs';
$config['tables']['people']     = 'ap_people';
$config['tables']['pages']      = 'ap_pages';

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
