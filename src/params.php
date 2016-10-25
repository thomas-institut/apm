<?php
/**
 * @file params.php
 *
 * Global configuration values that shouldn't be changed 
 * by the user installing the system.
 * 
 * Installation configuration should be given in config.php
 */

$params['app_name'] = 'Averroes Project';
$params['version'] = '0.03';
$params['app_shortname'] = 'Averroes';
$params['app_name_htmlart'] = '<span class="logo">Averroes Project</span>';
$params['copyright_notice'] = '2016, <a href="http://www.thomasinstitut.uni-koeln.de/">Thomas-Institut</a>, <a href="http://www.uni-koeln.de/">Universität zu Köln</a>';

$params['default_timezone'] = "Europe/Berlin";

$params['tables'] = array();
$params['tables']['settings']   = 'ap_settings';
$params['tables']['ednotes']    = 'ap_ednotes';
$params['tables']['elements']   = 'ap_elements';
$params['tables']['items']      = 'ap_items';
$params['tables']['hands']      = 'ap_hands';
$params['tables']['users']      = 'ap_users';

?>