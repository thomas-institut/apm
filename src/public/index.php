<?php

/* 
 *  Copyright (C) 2019 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */


/**
 * @brief Dispatcher for site and API
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
namespace AverroesProject;

use AverroesProject\Data\DataManager;
use APM\System\ApmSystemManager;
use Slim\App;
use Slim\Views\Twig;
use Slim\Views\TwigExtension;

require 'vendor/autoload.php';
require 'setup.php';
require 'version.php';


/**
 * Exits with an error message
 * @param $msg
 */
function exitWithErrorMessage(string $msg) {
    http_response_code(503);
    print "<pre>ERROR: $msg";
    exit();
}

global $config;

// System Manager 
$systemManager = new ApmSystemManager($config);

if ($systemManager->fatalErrorOccurred()) {
    exitWithErrorMessage($systemManager->getErrorMsg());
}

$logger = $systemManager->getLogger();
$dbh = $systemManager->getDbConnection();
$hm = $systemManager->getHookManager();
$cr = $systemManager->getCollationEngine();

// Data Manager (will be replaced completely by SystemManager at some point
$db = new DataManager($dbh, $systemManager->getTableNames(), $logger, $hm, $config['langCodes']);

// Initialize the Slim app
$app = new App(["settings" => $config]);

$container = $app->getContainer();

$container['config'] = $config;
$container['db'] = $db;
$container['dbh'] = $dbh;
$container['logger'] = $logger;
$container['hm'] = $hm;
$container['cr'] = $cr;
$container['sm'] = $systemManager;

$container['userId'] = 0;  // The authentication module will update this with the correct Id 
//
// Twig
$container['view'] = function ($container) {
    $view = new Twig('templates', [
        'cache' => false   // Change this eventually!
    ]);
    $basePath = $container['config']['baseurl'];
    $view->addExtension(new TwigExtension(
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

$app->get('/chunk/{work}/{chunk}','\APM\Site\ChunkPage:singleChunkPage')
        ->setName('chunk')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

$app->get('/chunk/{work}/{chunk}/witness/{type}/{id}[/{output}]','\APM\Site\ChunkPage:witnessPage')        
        ->setName('witness')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// COLLATION TABLES


// Collation table with preset
$app->get('/collation/auto/{work}/{chunk}/preset/{preset}','\APM\Site\SiteCollationTable:automaticCollationPagePreset')
        ->setName('chunk.collationtable.preset')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// Collation table with parameters in Url
$app->get('/collation/auto/{work}/{chunk}/{lang}[/{ignore_punct}[/{docs:.*}]]','\APM\Site\SiteCollationTable:automaticCollationPageGet')
        ->setName('chunk.collationtable')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');

// Collation table with full options in post
$app->post('/collation/auto/{work}/{chunk}/{lang}/custom','\APM\Site\SiteCollationTable:automaticCollationPageCustom')
        ->setName('chunk.collationtable.custom')
        ->add('\AverroesProject\Auth\Authenticator:authenticate');



$app->get('/collation/quick', '\APM\Site\SiteCollationTable:quickCollationPage')
        ->setName('quickcollation');


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
    
    $this->post('/collation/auto',
            '\APM\Api\ApiCollation:automaticCollation'
            )
        ->setName('api.collation.auto');

    // ------ EDITION ENGINE ------

    $this->post('/edition/auto',
        '\APM\Api\ApiEditionEngine:basicEditionEngine'
    )
        ->setName('api.edition.auto');
    
    // ------- PRESETS -----------
    $this->post('/presets/get', 
        '\APM\Api\ApiPresets:getPresets'
        )
        ->setName('api.presets.get');
    
    $this->get('/presets/delete/{id}', 
        '\APM\Api\ApiPresets:deletePreset'
        )
        ->setName('api.presets.delete');
    
    $this->post('/presets/act/get', 
        '\APM\Api\ApiPresets:getAutomaticCollationPresets'
        )
        ->setName('api.presets.act.get');
    
    $this->post('/presets/post', 
        '\APM\Api\ApiPresets:savePreset'
        )
        ->setName('api.presets.post');
    
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

// -----------------
// PUBLIC API
// -----------------

$app->group('/api/public', function (){
// API -> quick collation
    $this->post('/collation/quick', 
            '\APM\Api\ApiCollation:quickCollation')
        ->setName('api.collation.quick');
});



// All set, run!
$app->run();
