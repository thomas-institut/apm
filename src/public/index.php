<?php
/*
 * Copyright (C) 2016 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/**
 * @brief Dispatcher for site and API
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
namespace AverroesProject;

require 'vendor/autoload.php';

use AverroesProject\DataTable\MySqlDataTable;
use AverroesProject\DataTable\MySqlDataTableWithRandomIds;

/**
 * Runtime configurations: DB credentials, base URL
 */
require 'config.php';

/**
 * MySQL table configuration
 */
require 'config.tables.php';


// Application parameters
$config['app_name'] = 'Averroes Project Manager';
$config['version'] = '0.0.13 (α)';
$config['copyright_notice'] = '2016-17, <a href="http://www.thomasinstitut.uni-koeln.de/">Thomas-Institut</a>, <a href="http://www.uni-koeln.de/">Universität zu Köln</a>';

$config['default_timezone'] = "Europe/Berlin";

// Slim parameters
$config['addContentLengthHeader'] = false;

// Initialize the Slim app
$app = new \Slim\App(["settings" => $config]);
date_default_timezone_set($config['default_timezone']);

// Setup the app's container
$container = $app->getContainer();

// Error Handling
//$container['errorHandler'] = function ($c) {
//    return function($request, $response, $exception){
//        return \AverroesProject\SiteController::errorPage($request, $response, $exception);
//    };
//};

// Big Data manager... will be gone at some point
$container['db'] = function($c){
   $db = new AverroesProjectData($c['settings']['db'], 
           $c['settings']['tables']);
   return $db ;
};

// PDO Database and others
$container['dbh'] = function($c){
   $dbh = new \PDO('mysql:dbname='. $c['settings']['db']['db'] . ';host=' . 
           $c['settings']['db']['host'], $c['settings']['db']['user'], 
           $c['settings']['db']['pwd']);
   $dbh->query("set character set 'utf8'");
   $dbh->query("set names 'utf8'");
   return $dbh ;
};

// User Manager
$container['um'] = function ($c){
    $um = new UserManager(
            new MySqlDataTableWithRandomIds($c->dbh, 
                    $c['settings']['tables']['users'], 10000, 100000),
            new MySqlDataTable($c->dbh, $c['settings']['tables']['relations']), 
            new MySqlDataTable($c->dbh, $c['settings']['tables']['people']));
    return $um;
            
};

// Twig
$container['view'] = function ($container) {
    $view = new \Slim\Views\Twig('templates', [
        'cache' => false   // Change this eventually!
    ]);
    // Instantiate and add Slim specific extension
    $basePath = rtrim(str_ireplace('index.php', '', 
            $container['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new \Slim\Views\TwigExtension(
            $container['router'], $basePath));
    return $view;
};


// -----------------------------------------------------------------------------
//  SITE ROUTES
// -----------------------------------------------------------------------------
 
// LOGIN
$app->any('/login', '\AverroesProject\Site\SiteAuthentication:login')
        ->setName('login');

// LOGOUT
$app->any('/logout', '\AverroesProject\Site\SiteAuthentication:logout')
        ->setName('logout');


// HOME
$app->get('/','\AverroesProject\Site\SiteController:homePage')
        ->setName('home')
        ->add('\AverroesProject\Site\SiteAuthentication:authenticate');

// USER.PROFILE
$app->get('/user/{username}', 
        '\AverroesProject\Site\SiteController:userProfilePage')
        ->setName('user.profile')
        ->add('\AverroesProject\Site\SiteAuthentication:authenticate');

// USER.SETTINGS
$app->get('/user/{username}/settings', 
        '\AverroesProject\Site\SiteController:userSettingsPage')
        ->setName('user.settings')
        ->add('\AverroesProject\Site\SiteAuthentication:authenticate');

$app->get('/users', '\AverroesProject\Site\SiteController:userManagerPage')
        ->setName('user.manager')
        ->add('\AverroesProject\Site\SiteAuthentication:authenticate');

// DOCS
$app->get('/documents','\AverroesProject\Site\SiteController:documentsPage')
        ->setName('docs')
        ->add('\AverroesProject\Site\SiteAuthentication:authenticate');

// PAGEVIEWER
$app->get('/pageviewer/{doc}/{page}', 
        '\AverroesProject\Site\SiteController:pageViewerPage')
        ->setName('pageviewer')
        ->add('\AverroesProject\Site\SiteAuthentication:authenticate');



// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

$app->group('/api', function (){
    
    // API -> getElements
    $this->get('/{document}/{page}/{column}/elements', 
            '\AverroesProject\Api\ApiController:getElementsByDocPageCol')
        ->setName('api_getelements');
    
    // API -> numColumns
    $this->get('/{document}/{page}/numcolumns', 
            '\AverroesProject\Api\ApiController:getNumColumns')
        ->setName('api_numcolumns');

})->add('\AverroesProject\Api\ApiAuthentication');


// All set, run!
$app->run();