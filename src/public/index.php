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

use AverroesProject\Data\DataManager;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use AverroesProject\Data\DatabaseChecker;

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
$config['version'] = '0.5.2 (beta, 2017-07-10)';
$config['copyright_notice'] = <<<EOD
        2016-17, 
        <a href="http://www.thomasinstitut.uni-koeln.de/">
            Thomas-Institut</a>, 
        <a href="http://www.uni-koeln.de/">
            Universität zu Köln
        </a>
EOD;
$config['default_timezone'] = "Europe/Berlin";

// Slim parameters
$config['addContentLengthHeader'] = false;


function exitWithError($logger, $msg, $logMsg = '') 
{
    if ($logMsg === '') {
        $logMsg = $msg;
    }
    $logger->error($logMsg);
    http_response_code(503);
    print "ERROR: $msg";
    exit();
}


// Set timezone
date_default_timezone_set($config['default_timezone']);

// Setup logger
$logStream = new StreamHandler(__DIR__ . '/' . $config['logfilename'], 
        Logger::DEBUG);
$phpLog = new \Monolog\Handler\ErrorLogHandler();
$logger = new Logger('APM');
$logger->pushHandler($logStream);
$logger->pushHandler($phpLog);
$logger->pushProcessor(new \Monolog\Processor\WebProcessor);

//
// Set up database connection
//
try {
    $dbh = new \PDO('mysql:dbname='. $config['db']['db'] . ';host=' . 
               $config['db']['host'], $config['db']['user'], 
               $config['db']['pwd']);
    $dbh->query("set character set 'utf8'");
    $dbh->query("set names 'utf8'");
} catch (\PDOException $e) {
    exitWithError($logger, 
            "Database connection failed", 
            "Database connection failed: " . $e->getMessage());
}

//
// Check database
//
$dbChecker = new DatabaseChecker($dbh, $config['tables']);

if (!$dbChecker->isDatabaseInitialized()) {
    exitWithError($logger, "Database is not initialized");
}

if (!$dbChecker->isDatabaseUpToDate()) {
    exitWithError($logger, "Database schema not up to date");
}

$db = new DataManager($dbh, $config['tables'], $logger);
 
// Initialize the Slim app
$app = new \Slim\App(["settings" => $config]);

$container = $app->getContainer();

$container['db'] = $db;
$container['dbh'] = $dbh;
$container['logger'] = $logger;

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
$app->any('/login', '\AverroesProject\Auth\Authenticator:login')
        ->setName('login');

// LOGOUT
$app->any('/logout', '\AverroesProject\Auth\Authenticator:logout')
        ->setName('logout');


// HOME
$app->get('/','\AverroesProject\Site\SiteController:homePage')
        ->setName('home')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// USER.PROFILE
$app->get('/user/{username}', 
        '\AverroesProject\Site\SiteController:userProfilePage')
        ->setName('user.profile')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// USER.SETTINGS
$app->get('/user/{username}/settings', 
        '\AverroesProject\Site\SiteController:userSettingsPage')
        ->setName('user.settings')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/users', '\AverroesProject\Site\SiteController:userManagerPage')
        ->setName('user.manager')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// DOCS
$app->get('/documents','\AverroesProject\Site\SiteController:documentsPage')
        ->setName('docs')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/doc/{id}','\AverroesProject\Site\SiteController:showDocPage')
        ->setName('doc.showdoc')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// PAGEVIEWER
$app->get('/pageviewer/{doc}/{page}', 
        '\AverroesProject\Site\SiteController:pageViewerPage')
        ->setName('pageviewer')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');



// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

$app->group('/api', function (){
    
    // API -> getElements
    $this->get('/{document}/{page}/{column}/elements', 
            '\AverroesProject\Api\ApiController:getElementsByDocPageCol')
        ->setName('api.getelements');
    
    $this->post('/{document}/{page}/{column}/elements/update', 
            '\AverroesProject\Api\ApiController:updateElementsByDocPageCol')
        ->setName('api.updateelements');
    
    // API -> numColumns
    $this->get('/{document}/{page}/numcolumns', 
            '\AverroesProject\Api\ApiController:getNumColumns')
        ->setName('api.numcolumns');
    
    // API -> numColumns
    $this->get('/{document}/{page}/newcolumn', 
            '\AverroesProject\Api\ApiController:addNewColumn')
        ->setName('api.newcolumn');
    
    // API -> user : get profile info
    $this->get('/user/{userId}/info', 
            '\AverroesProject\Api\ApiController:getUserProfileInfo')
        ->setName('api.user.info');
    
    // API -> user : update profile
    $this->post('/user/{userId}/update', 
            '\AverroesProject\Api\ApiController:updateUserProfile')
        ->setName('api.user.update');

    // API -> user : change password
    $this->post('/user/{userId}/changepassword', 
            '\AverroesProject\Api\ApiController:changeUserPassword')
        ->setName('api.user.changepassword');
    
    // API -> user : make root
    $this->post('/user/{userId}/makeroot', 
            '\AverroesProject\Api\ApiController:makeUserRoot')
        ->setName('api.user.makeroot');
    
    // API -> user : add new user
    $this->post('/user/new', 
            '\AverroesProject\Api\ApiController:createNewUser')
        ->setName('api.user.new');
    
    // API -> images : Mark Icon
    $this->get('/images/mark/{size}', 
            '\AverroesProject\Api\ApiController:generateMarkIcon')
        ->setName('api.images.mark');
    
    // API -> images : No Word Break Icon
    $this->get('/images/nowb/{size}', 
            '\AverroesProject\Api\ApiController:generateNoWordBreakIcon')
        ->setName('api.images.nowb');
    
    // API -> images : Illegible Icon
    $this->get('/images/illegible/{size}/{length}', 
            '\AverroesProject\Api\ApiController:generateIllegibleIcon')
        ->setName('api.images.illegible');
    
    // API -> images : ChunkMark Icon
    $this->get('/images/chunkmark/{dareid}/{chunkno}/{type}/{dir}/{size}', 
            '\AverroesProject\Api\ApiController:generateChunkMarkIcon')
        ->setName('api.images.chunkmark');
    
    // API -> images : Line Gap Mark
    $this->get('/images/linegap/{count}/{size}', 
            '\AverroesProject\Api\ApiController:generateLineGapImage')
        ->setName('api.images.linegap');
    
})->add('\AverroesProject\Auth\Authenticator:authenticateApiRequest');


// All set, run!
$app->run();
