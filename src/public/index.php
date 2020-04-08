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

use APM\Api\ApiWitness;
use APM\Site\SiteChunkPage;
use APM\Site\SiteCollationTable;
use APM\Site\SiteDocuments;
use APM\System\ApmContainerKey;
use APM\System\RouteMiddleware;
use DI\ContainerBuilder;

use Exception;
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;

use APM\System\ApmSystemManager;

use APM\Site\SiteDashboard;
use APM\Site\SiteHomePage;
use APM\Site\SiteUserManager;
use APM\Site\SiteChunks;
use APM\Site\SitePageViewer;
use APM\System\Auth\Authenticator;

use APM\Api\ApiIcons;
use APM\Api\ApiDocuments;
use APM\Api\ApiUsers;
use APM\Api\ApiCollation;
use APM\Api\ApiPresets;
use APM\Api\ApiEditionEngine;
use APM\Api\ApiElements;

use AverroesProject\Data\DataManager;

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
    exitWithErrorMessage($systemManager->getErrorMessage());
}

$logger = $systemManager->getLogger();
$hm = $systemManager->getHookManager();
$dbh = $systemManager->getDbConnection();

// Data Manager (will be replaced completely by SystemManager at some point
$dataManager = new DataManager($dbh, $systemManager->getTableNames(), $logger, $hm, $config['langCodes']);
$dataManager->setSqlQueryCounterTracker($systemManager->getSqlQueryCounterTracker());
$dataManager->userManager->setSqlQueryCounterTracker($systemManager->getSqlQueryCounterTracker());

$builder = new ContainerBuilder();
$builder->addDefinitions([
    ApmContainerKey::CONFIG => $config,
    ApmContainerKey::IS_PROXIED => false,
    ApmContainerKey::DATA_MANAGER => $dataManager,
    ApmContainerKey::LOGGER => $logger,
    ApmContainerKey::SYSTEM_MANAGER => $systemManager,
    ApmContainerKey::USER_ID => 0,  // The authentication module will update this with the correct Id
    ApmContainerKey::VIEW => function() {
        return new Twig('templates', ['cache' => false]);
    }
]);

try {
    $container = $builder->build();
} catch (Exception $e) {
    exitWithErrorMessage('Error creating container: '. $e->getMessage());
}

// Initialize the Slim app
AppFactory::setContainer($container);
$app = AppFactory::create();

$subdir = $systemManager->getBaseUrlSubdir();
if ($subdir !== '') {
    $app->setBasePath($subdir);
}


//$routeMW = new RouteMiddleware($container);
//$routeMW->setLogger($logger->withName('ROUTING'));
//$app->addMiddleware($routeMW);

$app->addErrorMiddleware(true, true, true);

// Add Twig middleware and router
$app->add(TwigMiddleware::createFromContainer($app));
$container->set(ApmContainerKey::ROUTER, $app->getRouteCollector()->getRouteParser());
//$container->set(ApmContainerKey::ROUTE_COLLECTOR, $app->getRouteCollector());


// -----------------------------------------------------------------------------
//  SITE ROUTES
// -----------------------------------------------------------------------------
 
// LOGIN and LOGOUT
$app->any('/login',
    Authenticator::class . ':login')
    ->setName('login');

$app->any('/logout',
    Authenticator::class  . ':logout')
    ->setName('logout');


// PUBLIC ACCESS

$app->get('/collation/quick', SiteCollationTable::class . ':quickCollationPage')
    ->setName('quickcollation');


// AUTHENTICATED ACCESS

$app->group('', function (RouteCollectorProxy $group){

    // HOME

    $group->get('/',
        SiteHomePage::class . ':homePage')
        ->setName('home');

    // DASHBOARD

    $group->get('/dashboard',
        SiteDashboard::class . ':dashboardPage')
        ->setName('dashboard');

    // USER.PROFILE

    $group->get('/user/{username}',
        SiteUserManager::class . ':userProfilePage')
        ->setName('user.profile');

    // USER.SETTINGS

    $group->get('/user/{username}/settings',
        SiteUserManager::class . ':userSettingsPage')
        ->setName('user.settings');

    $group->get('/users',
        SiteUserManager::class . ':userManagerPage')
        ->setName('user.manager');

    // CHUNKS

    $group->get('/chunks',
        SiteChunks::class . ':chunksPage')
        ->setName('chunks');

    $group->get('/chunk/{work}/{chunk}',
        SiteChunkPage::class . ':singleChunkPage')
        ->setName('chunk');


    $group->get('/chunks/map[/{timestamp}]',
        SiteChunks::class . ':fullTxMapPage')
        ->setName('fullTxMap');

    // COLLATION TABLES

    // Collation table with preset
    $group->get('/collation/auto/{work}/{chunk}/preset/{preset}',
        SiteCollationTable::class . ':automaticCollationPagePreset')
        ->setName('chunk.collationtable.preset');

    // Collation table with parameters in Url
    $group->get('/collation/auto/{work}/{chunk}/{lang}[/{ignore_punct}[/{witnesses:.*}]]',
        SiteCollationTable::class . ':automaticCollationPageGet')
        ->setName('chunk.collationtable');

    // Collation table with full options in post
    $group->post('/collation/auto/{work}/{chunk}/{lang}/custom',
        SiteCollationTable::class . ':automaticCollationPageCustom')
        ->setName('chunk.collationtable.custom');

    // edit collation table
    $group->get('/collation/edit/{work}/{chunk}/{tableId}',
        SiteCollationTable::class . ':editCollationTable')
        ->setName('collationtable.edit');

    // DOCS

    $group->get('/documents',
        SiteDocuments::class . ':documentsPage')
        ->setName('docs');

    $group->get('/doc/{id}/details',
        SiteDocuments::class . ':showDocPage')
        ->setName('doc.showdoc');

    $group->get('/doc/{id}/definepages',
        SiteDocuments::class . ':defineDocPages')
        ->setName('doc.definedocpages');

    $group->get('/doc/{id}/edit',
        SiteDocuments::class . ':editDocPage')
        ->setName('doc.editdoc');

    $group->get('/doc/new',
        SiteDocuments::class . ':newDocPage')
        ->setName('doc.new');

    // PAGE VIEWER / TRANSCRIPTION EDITOR
    $group->get('/doc/{doc}/realpage/{page}/view',
        SitePageViewer::class . ':pageViewerPageByDocPage')
        ->setName('pageviewer.docpage');

    $group->get('/doc/{doc}/page/{seq}/view[/c/{col}]',
        SitePageViewer::class . ':pageViewerPageByDocSeq')
        ->setName('pageviewer.docseq');

})->add(Authenticator::class . ':authenticate');

// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

// AUTHENTICATED API

$app->group('/api', function (RouteCollectorProxy $group){

    // ELEMENTS

    // API -> getElements
    $group->get('/{document}/{page}/{column}/elements',
        ApiElements::class .  ':getElementsByDocPageCol')
        ->setName('api.getelements');

    //  API -> getElements (with version Id)
    $group->get('/{document}/{page}/{column}/elements/version/{version}',
        ApiElements::class . ':getElementsByDocPageCol')
        ->setName('api.getelements.withversion');

    // API -> updateColumnElements
    $group->post('/{document}/{page}/{column}/elements/update',
        ApiElements::class . ':updateElementsByDocPageCol')
        ->setName('api.updateelements');

    // DOCUMENTS

     // API -> create new document
    $group->post('/doc/new',
        ApiDocuments::class . ':newDocument')
        ->setName('api.doc.new');

    // API -> delete document
    $group->get('/doc/{id}/delete',
        ApiDocuments::class . ':deleteDocument')
        ->setName('api.doc.delete');

    // API -> add pages to a document
     $group->post('/doc/{id}/addpages',
         ApiDocuments::class . ':addPages')
        ->setName('api.doc.addpages');

    // API -> update document settings
    $group->post('/doc/{id}/update',
        ApiDocuments::class . ':updateDocSettings')
        ->setName('api.doc.update');

    // API -> numColumns
    $group->get('/{document}/{page}/numcolumns',
        ApiDocuments::class . ':getNumColumns')
        ->setName('api.numcolumns');

    // API -> updatePageSettings
    $group->post('/page/{pageId}/update',
        ApiDocuments::class . ':updatePageSettings')
        ->setName('api.updatepagesettings');

    $group->post('/page/bulkupdate',
        ApiDocuments::class . ':updatePageSettingsBulk')
        ->setName('api.updatepagesettings.bulk');

    // API -> numColumns
    $group->get('/{document}/{page}/newcolumn',
        ApiDocuments::class . ':addNewColumn')
        ->setName('api.newcolumn');

    //  USERS

    // API -> user : get profile info
    $group->get('/user/{userId}/info',
        ApiUsers::class . ':getUserProfileInfo')
        ->setName('api.user.info');

    // API -> user : update profile
    $group->post('/user/{userId}/update',
        ApiUsers::class . ':updateUserProfile')
        ->setName('api.user.update');

    // API -> user : change password
    $group->post('/user/{userId}/changepassword',
        ApiUsers::class . ':changeUserPassword')
        ->setName('api.user.changepassword');

    // API -> user : make root
    $group->post('/user/{userId}/makeroot',
            ApiUsers::class . ':makeUserRoot')
        ->setName('api.user.makeroot');

    // API -> user : add new user
    $group->post('/user/new',
        ApiUsers::class . ':createNewUser')
        ->setName('api.user.new');

    // WITNESSES
    $group->get('/witness/get/{witnessId}[/{outputType}[/{cache}]]',
        ApiWitness::class . ':getWitness')
        ->setName('api.witness.get');

    // COLLATION TABLES

    $group->post('/collation/auto',
        ApiCollation::class . ':automaticCollation')
        ->setName('api.collation.auto');


    $group->post('/collation/save',
        ApiCollation::class . ':saveCollationTable')
        ->setName('api.collation.save');

    //  EDITION ENGINE

    $group->post('/edition/auto',
        ApiEditionEngine::class . ':automaticEditionEngine')
        ->setName('api.edition.auto');

    //  PRESETS

    $group->post('/presets/get',
        ApiPresets::class . ':getPresets')
        ->setName('api.presets.get');

    $group->get('/presets/delete/{id}',
        ApiPresets::class . ':deletePreset')
        ->setName('api.presets.delete');

    $group->post('/presets/act/get',
        ApiPresets::class . ':getAutomaticCollationPresets')
        ->setName('api.presets.act.get');

    $group->post('/presets/post',
        ApiPresets::class . ':savePreset')
        ->setName('api.presets.post');

    //  ICONS

    // API -> images : Mark Icon
    $group->get('/images/mark/{size}',
        ApiIcons::class . ':generateMarkIcon')
        ->setName('api.images.mark');

    // API -> images : No Word Break Icon
    $group->get('/images/nowb/{size}',
        ApiIcons::class . ':generateNoWordBreakIcon')
        ->setName('api.images.nowb');

    // API -> images : Illegible Icon
    $group->get('/images/illegible/{size}/{length}',
        ApiIcons::class . ':generateIllegibleIcon')
        ->setName('api.images.illegible');

    // API -> images : ChunkMark Icon
    $group->get('/images/chunkmark/{dareid}/{chunkno}/{lwid}/{segment}/{type}/{dir}/{size}',
        ApiIcons::class . ':generateChunkMarkIcon')
        ->setName('api.images.chunkmark');

    // API -> images : Line Gap Mark
    $group->get('/images/linegap/{count}/{size}',
        ApiIcons::class . ':generateLineGapImage')
        ->setName('api.images.linegap');

    // API -> images : Character Gap Mark
    $group->get('/images/charactergap/{length}/{size}',
        ApiIcons::class . ':generateCharacterGapImage')
        ->setName('api.images.charactergap');

    // API -> images : Paragraph Mark
    $group->get('/images/paragraphmark/{size}',
        ApiIcons::class . ':generateParagraphMarkIcon')
        ->setName('api.images.charactergap');

})->add(Authenticator::class . ':authenticateApiRequest');

// PUBLIC API

$app->group('/api/public', function (RouteCollectorProxy $group){

    // API -> quick collation
    $group->post('/collation/quick',
        ApiCollation::class . ':quickCollation')
        ->setName('api.collation.quick');
});

// -----------------------------------------------------------------------------
//  RUN!
// -----------------------------------------------------------------------------

$app->run();
