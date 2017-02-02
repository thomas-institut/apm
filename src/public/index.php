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
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';
require 'classes/AverroesProjectData.php';
require 'classes/SiteAuthentication.php';
require 'classes/SiteController.php';
require 'classes/ApiAuthentication.php';
require 'classes/ApiController.php';
require 'classes/UserManager.php';


// Options that change from development to production
// (e.g., database access credentials) go into config.php
require 'config.php';


// Application parameters
$config['app_name'] = 'Averroes Project Manager';
$config['version'] = '0.0.12 (α)';
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
// Database

// Big Data manager... will be gone at some point
$container['db'] = function($c){
   $db = new AverroesProjectData($c['settings']['db'], $c['settings']['tables']);
   return $db ;
};

// PDO Database and others
$container['dbh'] = function($c){
   $dbh = new \PDO('mysql:dbname='. $c['settings']['db']['db'] . ';host=' . $c['settings']['db']['host'], $c['settings']['db']['user'], $c['settings']['db']['pwd']);
   $dbh->query("set character set 'utf8'");
   $dbh->query("set names 'utf8'");
   return $dbh ;
};

$container['um'] = function ($c){
    $um = new UserManager(
            new MySQLDataTableWithRandomIds($c->dbh, $c['settings']['tables']['users'], 10000, 100000),
            new MySQLDataTable($c->dbh, $c['settings']['tables']['relations']), 
            new MySQLDataTable($c->dbh, $c['settings']['tables']['people']));
    return $um;
            
};

// Twig
$container['view'] = function ($container) {
    $view = new \Slim\Views\Twig('templates', [
        'cache' => false   // Change this eventually!
    ]);
    // Instantiate and add Slim specific extension
    $basePath = rtrim(str_ireplace('index.php', '', $container['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new \Slim\Views\TwigExtension($container['router'], $basePath));
    return $view;
};


// -----------------------------------------------------------------------------
//  SITE ROUTES
// -----------------------------------------------------------------------------
 
// LOGIN
$app->any('/login', '\AverroesProject\SiteAuthentication:login')
        ->setName('login');

// LOGOUT
$app->any('/logout', '\AverroesProject\SiteAuthentication:logout')
        ->setName('logout');


// HOME
$app->get('/','\AverroesProject\SiteController:homePage')
        ->setName('home')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

// USER.PROFILE
$app->get('/user/{username}', '\AverroesProject\SiteController:userProfilePage')
        ->setName('user.profile')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

// USER.SETTINGS
$app->get('/user/{username}/settings', '\AverroesProject\SiteController:userSettingsPage')
        ->setName('user.settings')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

$app->get('/users', '\AverroesProject\SiteController:userManagerPage')
        ->setName('user.manager')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

// DOCS
$app->get('/documents','\AverroesProject\SiteController:documentsPage')
        ->setName('docs')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

// PAGEVIEWER
$app->get('/pageviewer/{doc}/{page}', '\AverroesProject\SiteController:pageViewerPage')
        ->setName('pageviewer')
        ->add('\AverroesProject\SiteAuthentication:authenticate');



// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

$app->group('/api', function (){
    
    // API -> getElements
    $this->get('/{document}/{page}/{column}/elements', '\AverroesProject\ApiController:getElementsByDocPageCol')
        ->setName('api_getelements');
    
    // API -> numColumns
    $this->get('/{document}/{page}/numcolumns', '\AverroesProject\ApiController:getNumColumns')
        ->setName('api_numcolumns');

})->add('\AverroesProject\ApiAuthentication');


// All set, run!
$app->run();
