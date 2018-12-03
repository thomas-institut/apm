<?php
/*
 * Copyright (C) 2016-18 Universität zu Köln
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

/**
 * Runtime configurations: DB credentials, base URL
 *  setup.php loads and process config.php
 */
require 'setup.php';


use AverroesProject\Data\DataManager;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use AverroesProject\Data\DatabaseChecker;
use AverroesProject\Plugin\HookManager;
use AverroesProject\Collatex\CollatexRunner;


// Application parameters
$config['app_name'] = 'Averroes Project Manager';
$config['version'] = '0.17.0 (2018-Oct-30)';
$config['copyright_notice'] = <<<EOD
        2016-18, 
        <a href="http://www.thomasinstitut.uni-koeln.de/">
            Thomas-Institut</a>, 
        <a href="http://www.uni-koeln.de/">
            Universität zu Köln
        </a>
EOD;

$config['collatex']['collatexJarFile'] = 'collatex/bin/collatex-tools-1.7.1.jar';
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
$logStream = new StreamHandler($config['logfilename'], 
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
// Hook Manager
$hm = new HookManager();

// Load plugins (eventually this will be done by a PluginManager)
if ((include_once 'plugins/LocalImageSource.php') === false) {
    exitWithError($logger, "Can't load required plugin LocalImageSource");
}
$sisObject = new \LocalImageSource($hm, $logger);
$sisObject->init();

if ((include_once 'plugins/DareImageSource.php') === false) {
    exitWithError($logger, "Can't load required plugin DareImageSource");
}
$disObject = new \DareImageSource($hm, $logger);
$disObject->init();

if ((include_once 'plugins/DareDeepZoomImageSource.php') === false) {
    exitWithError($logger, "Can't load required plugin DareDeepZoomImageSource");
}
$ddzisObject = new \DareDeepZoomImageSource($hm, $logger);
$ddzisObject->init();

if ((include_once 'plugins/AverroesServerImageSource.php') === false) {
    exitWithError($logger, "Can't load required plugin AverroesServerImageSource");
}
$asisObject = new \AverroesServerImageSource($hm, $logger);
$asisObject->init();

// Data Manager
$db = new DataManager($dbh, $config['tables'], $logger, $hm, $config['langCodes']);

// Collation Runner

$cr = new CollatexRunner(
        $config['collatex']['collatexJarFile'], 
        $config['collatex']['tmp'], 
        $config['collatex']['javaExecutable']
        );
 
// Initialize the Slim app
$app = new \Slim\App(["settings" => $config]);

$container = $app->getContainer();

$container['db'] = $db;
$container['dbh'] = $dbh;
$container['logger'] = $logger;
$container['hm'] = $hm;
$container['cr'] = $cr;

$container['userId'] = 0;  // The authentication module will update this with the correct Id 
//
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
$app->get('/','\AverroesProject\Site\SiteHomePage:homePage')
        ->setName('home')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// DASHBOARD
$app->get('/dashboard','\AverroesProject\Site\SiteDashboard:dashboardPage')
        ->setName('dashboard')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');




// USER.PROFILE
$app->get('/user/{username}', 
        '\AverroesProject\Site\SiteUserManager:userProfilePage')
        ->setName('user.profile')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// USER.SETTINGS
$app->get('/user/{username}/settings', 
        '\AverroesProject\Site\SiteUserManager:userSettingsPage')
        ->setName('user.settings')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/users', '\AverroesProject\Site\SiteUserManager:userManagerPage')
        ->setName('user.manager')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// CHUNKS
$app->get('/chunks','\AverroesProject\Site\SiteChunks:chunksPage')
        ->setName('chunks')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

//$app->get('/chunk/{work}/{chunk}','\AverroesProject\Site\SiteChunks:singleChunkPage')
//        ->setName('chunk')
//        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/chunk/{work}/{chunk}','\AverroesProjectToApm\Site\ChunkPage:singleChunkPage')
        ->setName('chunk')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/chunk/{work}/{chunk}/witness/{type}/{id}','\AverroesProjectToApm\Site\ChunkPage:witnessPage')
        ->setName('witness')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// COLLATION TABLE
$app->get('/chunk/{work}/{chunk}/collation/{lang}[/{docs:.*}]','\AverroesProject\Site\SiteCollationTable:collationTablePage')
        ->setName('chunk.collationtable')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// Quick Collation
$app->get('/quickcollation', '\AverroesProject\Site\SiteCollationTable:quickCollationPage')
        ->setName('quickcollation');

$app->get('/new/quickcollation', '\APM\Site\SiteCollationTable:quickCollationPage')
        ->setName('new-quickcollation');


// DOCS
$app->get('/documents','\AverroesProject\Site\SiteDocuments:documentsPage')
        ->setName('docs')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/doc/{id}/details','\AverroesProject\Site\SiteDocuments:showDocPage')
        ->setName('doc.showdoc')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/doc/{id}/definepages','\AverroesProject\Site\SiteDocuments:defineDocPages')
        ->setName('doc.definedocpages')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/doc/{id}/edit','\AverroesProject\Site\SiteDocuments:editDocPage')
        ->setName('doc.editdoc')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/doc/new','\AverroesProject\Site\SiteDocuments:newDocPage')
        ->setName('doc.new')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// PAGEVIEWER
$app->get('/doc/{doc}/realpage/{page}/view', 
        '\AverroesProject\Site\SitePageViewer:pageViewerPageByDocPage')
        ->setName('pageviewer.docpage')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/doc/{doc}/page/{seq}/view', 
        '\AverroesProject\Site\SitePageViewer:pageViewerPageByDocSeq')
        ->setName('pageviewer.docseq')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');


// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

$app->group('/api', function (){
    
    // API -> getElements
    $this->get('/{document}/{page}/{column}/elements', 
            '\AverroesProject\Api\ApiElements:getElementsByDocPageCol')
        ->setName('api.getelements');
    
    
    // API -> updateColumnElements
    $this->post('/{document}/{page}/{column}/elements/update', 
            '\AverroesProject\Api\ApiElements:updateElementsByDocPageCol')
        ->setName('api.updateelements');


    // --------- DOCUMENTS ---------
    
     // API -> create new document
    $this->post('/doc/new', 
            '\AverroesProject\Api\ApiDocuments:newDocument')
        ->setName('api.doc.new');
    
    // API -> delete document
    $this->get('/doc/{id}/delete', 
            '\AverroesProject\Api\ApiDocuments:deleteDocument')
        ->setName('api.doc.delete');
    
    // API -> add pages to a document
     $this->post('/doc/{id}/addpages', 
            '\AverroesProject\Api\ApiDocuments:addPages')
        ->setName('api.doc.addpages');
    
    // API -> update document settings
    $this->post('/doc/{id}/update', 
            '\AverroesProject\Api\ApiDocuments:updateDocSettings')
        ->setName('api.doc.update');
    
    // API -> numColumns
    $this->get('/{document}/{page}/numcolumns', 
            '\AverroesProject\Api\ApiDocuments:getNumColumns')
        ->setName('api.numcolumns');
    
    // API -> updatePageSettings
    $this->post('/page/{pageId}/update', 
            '\AverroesProject\Api\ApiDocuments:updatePageSettings')
        ->setName('api.updatepagesettings');
    
    $this->post('/page/bulkupdate', 
            '\AverroesProject\Api\ApiDocuments:updatePageSettingsBulk')
        ->setName('api.updatepagesettings.bulk');
    
    // API -> numColumns
    $this->get('/{document}/{page}/newcolumn', 
            '\AverroesProject\Api\ApiDocuments:addNewColumn')
        ->setName('api.newcolumn');
    
    
    // --------- USERS ---------
    
    // API -> user : get profile info
    $this->get('/user/{userId}/info', 
            '\AverroesProject\Api\ApiUsers:getUserProfileInfo')
        ->setName('api.user.info');
    
    // API -> user : update profile
    $this->post('/user/{userId}/update', 
            '\AverroesProject\Api\ApiUsers:updateUserProfile')
        ->setName('api.user.update');

    // API -> user : change password
    $this->post('/user/{userId}/changepassword', 
            '\AverroesProject\Api\ApiUsers:changeUserPassword')
        ->setName('api.user.changepassword');
    
    // API -> user : make root
    $this->post('/user/{userId}/makeroot', 
            '\AverroesProject\Api\ApiUsers:makeUserRoot')
        ->setName('api.user.makeroot');
    
    // API -> user : add new user
    $this->post('/user/new', 
            '\AverroesProject\Api\ApiUsers:createNewUser')
        ->setName('api.user.new');
    
    // ------ COLLATION ------
    
    
    
    // ------- ICONS -----------
    
    // API -> images : Mark Icon
    $this->get('/images/mark/{size}', 
            '\AverroesProject\Api\ApiIcons:generateMarkIcon')
        ->setName('api.images.mark');
    
    // API -> images : No Word Break Icon
    $this->get('/images/nowb/{size}', 
            '\AverroesProject\Api\ApiIcons:generateNoWordBreakIcon')
        ->setName('api.images.nowb');
    
    // API -> images : Illegible Icon
    $this->get('/images/illegible/{size}/{length}', 
            '\AverroesProject\Api\ApiIcons:generateIllegibleIcon')
        ->setName('api.images.illegible');
    
    // API -> images : ChunkMark Icon
    $this->get('/images/chunkmark/{dareid}/{chunkno}/{segment}/{type}/{dir}/{size}', 
            '\AverroesProject\Api\ApiIcons:generateChunkMarkIcon')
        ->setName('api.images.chunkmark');
    
    // API -> images : Line Gap Mark
    $this->get('/images/linegap/{count}/{size}', 
            '\AverroesProject\Api\ApiIcons:generateLineGapImage')
        ->setName('api.images.linegap');
    
    // API -> images : Character Gap Mark
    $this->get('/images/charactergap/{length}/{size}', 
            '\AverroesProject\Api\ApiIcons:generateCharacterGapImage')
        ->setName('api.images.charactergap');
    
    // API -> images : Paragraph Mark
    $this->get('/images/paragraphmark/{size}', 
            '\AverroesProject\Api\ApiIcons:generateParagraphMarkIcon')
        ->setName('api.images.charactergap');
    
})->add('\AverroesProject\Auth\Authenticator:authenticateApiRequest');

$app->group('/api/public', function (){
// API -> quick collation
    $this->post('/collation/quick', 
            '\AverroesProject\Api\ApiCollation:quickCollation')
        ->setName('api.collation.quick');
});

$app->group('/api/new/public', function (){
// API -> quick collation
    $this->post('/collation/quick', 
            '\APM\Api\ApiCollation:quickCollation')
        ->setName('api.new.collation.quick');
});



// All set, run!
$app->run();
