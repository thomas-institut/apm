<?php
namespace AverroesProject;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require 'vendor/autoload.php';
require 'classes/AverroesProjectData.php';
require 'classes/SiteAuthentication.php';
require 'classes/SiteController.php';
require 'classes/ApiAuthentication.php';
require 'classes/ApiController.php';

require 'config.php';

// slim parameters
$config['addContentLengthHeader'] = false;


// Application parameters
$config['app_name'] = 'Averroes Project';
$config['version'] = '0.07';
$config['app_shortname'] = 'Averroes';
$config['copyright_notice'] = '2016, <a href="http://www.thomasinstitut.uni-koeln.de/">Thomas-Institut</a>, <a href="http://www.uni-koeln.de/">Universität zu Köln</a>';

$config['default_timezone'] = "Europe/Berlin";

$config['tables'] = array();
$config['tables']['settings']   = 'ap_settings';
$config['tables']['ednotes']    = 'ap_ednotes';
$config['tables']['elements']   = 'ap_elements';
$config['tables']['items']      = 'ap_items';
$config['tables']['hands']      = 'ap_hands';
$config['tables']['users']      = 'ap_users';
$config['tables']['docs']       = 'ap_docs';


// Initialize the app
$app = new \Slim\App(["settings" => $config]);
date_default_timezone_set($config['default_timezone']);

// Setup the app's container
$container = $app->getContainer();

// Database
$container['db'] = function($c){
   $db = new AverroesProjectData($c['settings']['db'], $c['settings']['tables']);
   return $db ;
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

// ---------------------------------------------------------
// 
// SITE ROUTES
// 
// ---------------------------------------------------------
 
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

// DOCS
$app->get('/documents','\AverroesProject\SiteController:documentsPage')
        ->setName('docs')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

// PAGEVIEWER

$app->get('/pageviewer/{doc}/{page}', '\AverroesProject\SiteController:pageViewerPage')
        ->setName('pageviewer')
        ->add('\AverroesProject\SiteAuthentication:authenticate');

// ---------------------------------------------------------
// 
// API ROUTES
// 
// ---------------------------------------------------------

$app->group('/api', function (){
    // API -> getElements
    $this->get('/elements/{document}/{page}/{column}', '\AverroesProject\ApiController:getElementsByDocPageCol')
        ->setName('api_getelements');

})->add('\AverroesProject\ApiAuthentication');

//
//  run!
// 
$app->run();
