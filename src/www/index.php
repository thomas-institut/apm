<?php
/*
 *  Copyright (C) 2019-2022 Universität zu Köln
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
namespace APM;


use APM\Api\ApiEditionSources;
use APM\Api\ApiLog;
use APM\Api\ApiMultiChunkEdition;
use APM\Api\ApiTranscription;
use APM\Api\ApiWorks;
use APM\Site\SiteApmLog;
use APM\Site\SiteMultiChunkEdition;
use APM\System\ConfigLoader;
use JetBrains\PhpStorm\NoReturn;
use Slim\App;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Routing\RouteCollectorProxy;
use Slim\Views\TwigMiddleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

use APM\System\ApmContainerKey;
use APM\System\ApmSystemManager;
use APM\System\ApmConfigParameter;

use AverroesProject\Data\DataManager;

use APM\Site\SiteDashboard;
use APM\Site\SiteHomePage;
use APM\Site\SiteUserManager;
use APM\Site\SiteChunks;
use APM\Site\SitePageViewer;
use APM\Site\SiteChunkPage;
use APM\Site\SiteCollationTable;
use APM\Site\SiteDocuments;
use APM\Site\SiteSearch;

use APM\System\Auth\Authenticator;

use APM\Api\ApiIcons;
use APM\Api\ApiDocuments;
use APM\Api\ApiUsers;
use APM\Api\ApiCollation;
use APM\Api\ApiPresets;
use APM\Api\ApiEditionEngine;
use APM\Api\ApiElements;
use APM\Api\ApiCollationTableConversion;
use APM\Api\ApiTypesetPdf;
use APM\Api\ApiWitness;
use APM\Api\ApiSearch;

use ThomasInstitut\Container\MinimalContainer;

require 'vendor/autoload.php';

/**
 * Exits with an error message
 * @param string $msg
 */
#[NoReturn] function exitWithErrorMessage(string $msg): void
{
    http_response_code(503);
    print "<pre>ERROR: $msg";
    exit();
}

if (!ConfigLoader::loadConfig()) {
    exitWithErrorMessage('Config file not found');
}

require 'setup.php';
require 'version.php';

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
$dataManager = new DataManager($dbh, $systemManager->getTableNames(), $logger, $hm, $config[ApmConfigParameter::LANG_CODES]);
$dataManager->setSqlQueryCounterTracker($systemManager->getSqlQueryCounterTracker());
$dataManager->userManager->setSqlQueryCounterTracker($systemManager->getSqlQueryCounterTracker());
$systemManager->setDataManager($dataManager);

$container = new MinimalContainer();
$container->set(ApmContainerKey::SYSTEM_MANAGER, $systemManager);
$container->set(ApmContainerKey::USER_ID, 0);  // The authentication module will update this with the correct ID

$responseFactory = new ResponseFactory();
$app = new App($responseFactory, $container);

$subDir = $systemManager->getBaseUrlSubDir();
if ($subDir !== '') {
    $app->setBasePath("/$subDir");
}

$app->addErrorMiddleware(true, true, true);
$router = $app->getRouteCollector()->getRouteParser();

$systemManager->setRouter($router);

// Add Twig middleware
$app->add(new TwigMiddleware($systemManager->getTwig(), $router, $app->getBasePath()));

// -----------------------------------------------------------------------------
//  SITE ROUTES
// -----------------------------------------------------------------------------
 
// LOGIN and LOGOUT
$app->any('/login',
    function(Request $request, Response $response, array $args) use ($container){
        $authenticator = new Authenticator($container);
        return $authenticator->login($request, $response, $args);
    })
    ->setName('login');

$app->any('/logout',
    function(Request $request, Response $response, array $args) use ($container){
        $authenticator = new Authenticator($container);
        return $authenticator->logout($request, $response, $args);
    })
    ->setName('logout');


// PUBLIC ACCESS

//$app->get('/collation/quick', SiteCollationTable::class . ':quickCollationPage')
//    ->setName('quickcollation');


// AUTHENTICATED ACCESS

$app->group('', function (RouteCollectorProxy $group) use ($container){

    // HOME

    $group->get('/',
        function(Request $request, Response $response, array $args) use ($container){
            $siteHomePage = new SiteHomePage($container);
            return $siteHomePage->homePage($request, $response, $args);
        })
        ->setName('home');

    // Search Page

    $group->get('/search',
        SiteSearch::class . ':searchPage')
        ->setName('search');

    // DASHBOARD

    $group->get('/dashboard',
        function(Request $request, Response $response, array $args) use ($container){
            $dashboard = new SiteDashboard($container);
            return $dashboard->DashboardPage($request, $response, $args);
        })
        ->setName('dashboard');

    // USER.PROFILE
    $group->get('/user/{username}',
        function(Request $request, Response $response, array $args) use ($container){
            $siteUserManager = new SiteUserManager($container);
            return $siteUserManager->userProfilePage($request, $response, $args);
        })
        ->setName('user.profile');

    // USER.SETTINGS

    $group->get('/user/{username}/settings',
        function(Request $request, Response $response, array $args) use ($container){
            $siteUserManager = new SiteUserManager($container);
            return $siteUserManager->userSettingsPage($request, $response, $args);
        })
        ->setName('user.settings');

    $group->get('/users',
        function(Request $request, Response $response, array $args) use ($container){
            $siteUserManager = new SiteUserManager($container);
            return $siteUserManager->userManagerPage($request, $response, $args);
        })
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
    $group->get('/collation/edit/{tableId}[/{type}]',
        SiteCollationTable::class . ':editCollationTable')
        ->setName('collationtable.edit');

    // EDITION
    $group->get('/edition/chunk/edit/{tableId}[/{type}]',
        SiteCollationTable::class . ':editCollationTable')
        ->setName('chunkedition.edit');


    // MULTI-CHUNK EDITION
    $group->get('/edition/multi/new',
        function(Request $request, Response $response, array $args) use ($container){
            $c = new SiteMultiChunkEdition($container);
            return $c->newMultiChunkEdition($request, $response, $args);
        }
       )->setName('mce.new');

    $group->get('/edition/multi/edit/{editionId}',
        function(Request $request, Response $response, array $args) use ($container){
            $c = new SiteMultiChunkEdition($container);
            return $c->getMultiChunkEdition($request, $response, $args);
        }
    )->setName('mce.edit');



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


    // ADMIN
    $group->get('/admin/log', SiteApmLog::class . ':apmLogPage')->setName('admin.log');



})->add(Authenticator::class . ':authenticate');

// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

// USER AUTHENTICATED API

$app->group('/api', function (RouteCollectorProxy $group) use ($container){
    // ADMIN

    // Search API
     $group->post('/search/keyword',
        ApiSearch::class . ':search')
        ->setName('search.keyword');

    $group->post('/search/titles',
        ApiSearch::class . ':getTitles')
        ->setName('search.titles');

    $group->post('/search/transcribers',
        ApiSearch::class . ':getTranscribers')
        ->setName('search.transcribers');

    // API -> log message from front end
    $group->post('/admin/log',
        ApiLog::class . ':frontEndLog')
        ->setName('api.admin.log');

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

    // API -> getPageInfo
    $group->post('/pages/info', ApiDocuments::class . ':getPageInfo')->setName('api.getPageInfo');

    // WORKS

    // API -> work : get work info
    $group->get('/work/{workId}/info',
        function(Request $request, Response $response, array $args) use ($container){
            $apiWorks = new ApiWorks($container);
            return $apiWorks->getWorkInfo($request, $response, $args);
        })
        ->setName('api.work.info');

    //  USERS  / PEOPLE

    // API -> user : get profile info
    $group->get('/user/{userId}/info',
        function(Request $request, Response $response, array $args) use ($container){
            $apiUsers = new ApiUsers($container);
            return $apiUsers->getUserProfileInfo($request, $response, $args);
        })
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

    // API -> user : get pages transcribed by user
    $group->get('/user/{userId}/transcribedPages', function(Request $request, Response $response, array $args) use ($container){
        $apiUsers = new ApiUsers($container);
        return $apiUsers->getTranscribedPages($request, $response, $args);
    } )->setName('api.user.transcribedPages');

    // API -> user : get collation tables (and chunk edition) by user
    $group->get('/user/{userId}/collationTables', function(Request $request, Response $response, array $args) use ($container){
        $apiUsers = new ApiUsers($container);
        return $apiUsers->getCollationTableInfo($request, $response, $args);
    } )->setName('api.user.collationTables');

    // API -> user : get multi-chunk editions by user
    $group->get('/user/{userId}/multiChunkEditions', function(Request $request, Response $response, array $args) use ($container){
        $apiUsers = new ApiUsers($container);
        return $apiUsers->getMultiChunkEditionInfo($request, $response, $args);
    } )->setName('api.user.multiChunkEditions');



    // WITNESSES
    $group->get('/witness/get/{witnessId}[/{outputType}[/{cache}]]',
        ApiWitness::class . ':getWitness')
        ->setName('api.witness.get');

    $group->post('/witness/check/updates',
        ApiWitness::class . ':checkWitnessUpdates')
        ->setName('api.witness.check.updates');

    $group->get('/witness/{witnessId}/to/edition',
        ApiCollation::class . ':convertWitnessToEdition')
        ->setName('api.witness.convert.to.edition');

    // COLLATION TABLES

    $group->post('/collation/auto',
        ApiCollation::class . ':automaticCollation')
        ->setName('api.collation.auto');

    $group->post('/collation/save',
        ApiCollation::class . ':saveCollationTable')
        ->setName('api.collation.save');

    $group->post('/collation/convert/{tableId}',
        ApiCollationTableConversion::class
    )->setName('api.collation.convert');

    $group->get('/collation/get/{tableId}[/{timestamp}]',  function(Request $request, Response $response, array $args) use ($container){
        $apiC = new ApiCollation($container);
        return $apiC->getTable($request, $response, $args);
    })->setName('api.collation.get');

    $group->get('/collation/info/edition/active',  function(Request $request, Response $response, array $args) use ($container){
        $apiC = new ApiCollation($container);
        return $apiC->getActiveEditions($request, $response, $args);
    })->setName('api.collation.info.edition.active');


    // EDITION SOURCES

    $group->get('/edition/sources/all',
        function(Request $request, Response $response, array $args) use ($container){
            $apiC = new ApiEditionSources($container);
            return $apiC->getAllSources($request, $response, $args);
        })->setName('api.edition_sources.get_all');


    $group->get('/edition/source/get/{uuid}',
        function(Request $request, Response $response, array $args) use ($container){
            $apiC = new ApiEditionSources($container);
            return $apiC->getSourceByUuid($request, $response, $args);
        })->setName('api.edition_sources.get');

    // MULTI CHUNK EDITION

    $group->get('/edition/multi/get/{editionId}[/{timestamp}]',
        function(Request $request, Response $response, array $args) use ($container){
            $apiC = new ApiMultiChunkEdition($container);
            return $apiC->getEdition($request, $response, $args);
        })->setName('api.multi_chunk.get');

    $group->post('/edition/multi/save', function(Request $request, Response $response, array $args) use ($container){
        $apiC = new ApiMultiChunkEdition($container);
        return $apiC->saveEdition($request, $response, $args);
    })->setName('api.multi_chunk.save');

    //  EDITION ENGINE

    // TODO: check this, most likely obsolete
    $group->post('/edition/auto',
        ApiEditionEngine::class . ':automaticEditionEngine')
        ->setName('api.edition.auto');

    // PDF CONVERSION
    $group->post('/convert/svg2pdf',
        ApiTypesetPdf::class . ':convertSVGtoPDF')
        ->setName('api.convert.svg2pdf');

    $group->post('/convert/ts2pdf',
        ApiTypesetPdf::class . ':convertTypesetterDataToPdf')
        ->setName('api.convert.ts2pdf');

    // TYPESETTING
    $group->post('/typeset/raw',
        ApiTypesetPdf::class . ':typesetRawData')
        ->setName('api.typeset.raw');

    //  PRESETS

    $group->post('/presets/get',
        ApiPresets::class . ':getPresets')
        ->setName('api.presets.get');

    $group->get('/presets/delete/{id}',
        ApiPresets::class . ':deletePreset')
        ->setName('api.presets.delete');

    $group->post('/presets/sigla/get',
        ApiPresets::class . ':getSiglaPresets')
        ->setName('api.presets.sigla.get');

    $group->post('/presets/sigla/save',
        ApiPresets::class . ':saveSiglaPreset')
        ->setName('api.presets.sigla.save');

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

    // API -> images : ChapterMark Icon
    $group->get('/images/chaptermark/{work}/{level}/{number}/{type}/{dir}/{size}',
        ApiIcons::class . ':generateChapterMarkIcon')
        ->setName('api.images.chaptermark');

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

//  API for DARE

$app->group('/api/data', function(RouteCollectorProxy $group){
    // get list of transcriptions available for download
    $group->get('/transcription/list', ApiTranscription::class . ':getList');

    // get the transcription for a given document and page
    $group->get('/transcription/get/{docId}/{page}', ApiTranscription::class . ':getTranscription');
})->add(Authenticator::class . ':authenticateDataApiRequest');

// PUBLIC API

// -----------------------------------------------------------------------------
//  RUN!
// -----------------------------------------------------------------------------

$app->run();
