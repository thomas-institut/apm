<?php
/*
 *  Copyright (C) 2016-2024 Universität zu Köln
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

namespace APM;

use APM\Api\ApiEditionSources;
use APM\Api\ApiEntity;
use APM\Api\ApiLog;
use APM\Api\ApiMultiChunkEdition;
use APM\Api\ApiPeople;
use APM\Api\ApiTranscription;
use APM\Api\ApiWorks;
use APM\Site\SiteMultiChunkEdition;
use APM\Site\SitePeople;
use APM\System\ConfigLoader;
use JetBrains\PhpStorm\NoReturn;
use Monolog\Handler\ErrorLogHandler;
use Monolog\Logger;
use Psr\Container\ContainerInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\App;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Routing\RouteCollectorProxy;
use Slim\Views\TwigMiddleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

use APM\System\ApmContainerKey;
use APM\System\ApmSystemManager;

use APM\Site\SiteDashboard;
use APM\Site\SiteHomePage;
use APM\Site\SiteWorks;
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
use ThomasInstitut\MinimalContainer\MinimalContainer;
use Twig\Error\LoaderError;

// Load system profiler first
require 'classes/APM/SystemProfiler.php';
SystemProfiler::start();

// autoload
require 'vendor/autoload.php';

// Load configuration
require 'config_setup.php';
require 'version.php';
if (!ConfigLoader::loadConfig()) {
    exitWithErrorMessage('Config file not found');
}
global $config;

// Set up logger
$logger = new Logger('APM');
$logger->pushHandler(new ErrorLogHandler());

// Build System Manager
$systemManager = new ApmSystemManager($config);
if ($systemManager->fatalErrorOccurred()) {
    exitWithErrorMessage($systemManager->getErrorMessage());
}

// Build container for Slim
$container = new MinimalContainer();
$container->set(ApmContainerKey::SYSTEM_MANAGER, $systemManager);
$container->set(ApmContainerKey::SITE_USER_TID, -1);
$container->set(ApmContainerKey::API_USER_TID, -1);

// Setup Slim App
$app = new App(new ResponseFactory(), $container);
$subDir = $systemManager->getBaseUrlSubDir();
if ($subDir !== '') {
    $app->setBasePath("/$subDir");
}
$app->addErrorMiddleware(true, true, true);
$router = $app->getRouteCollector()->getRouteParser();
$systemManager->setRouter($router);

try {
    $app->add(new TwigMiddleware($systemManager->getTwig(), $router, $app->getBasePath()));
} catch (LoaderError $e) {
    $systemManager->getLogger()->error("Loader error exception, aborting", [ 'msg' => $e->getMessage()]);
    exitWithErrorMessage("Could not set up application, please report to administrators");
}

createLoginRoutes($app, $container);
createSiteRoutes($app, $container);
createAuthenticatedApiRoutes($app, $container);
createDareApiRoutes($app, $container);

SystemProfiler::lap('Ready to run');
$app->run();

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

function createSiteRoutes(App $app, ContainerInterface $container) : void
{
    $app->group('', function (RouteCollectorProxy $group) use ($container){
        // HOME
        $group->get('/',
            function(Request $request, Response $response) use ($container){
                return (new SiteHomePage($container))->homePage($request, $response);
            })
            ->setName('home');

        // Search Page
        $group->get('/search',
            function(Request $request, Response $response) use ($container){
                return (new SiteSearch($container))->searchPage($request, $response);
            })
            ->setName('search');

        // People and Person Pages

        $group->get('/people',
            function(Request $request, Response $response) use ($container){
                return (new SitePeople($container))->peoplePage($request, $response);
            })
            ->setName('people');

        $group->get('/person/{tid}',
            function(Request $request, Response $response) use ($container){
                return (new SitePeople($container))->personPage($request, $response);
            })
            ->setName('person');

        // DASHBOARD
        $group->get('/dashboard',
            function(Request $request, Response $response) use ($container){
                return (new SiteDashboard($container))->DashboardPage($request, $response);
            })
            ->setName('dashboard');

        // WORKS

        $group->get('/works',
            function(Request $request, Response $response) use ($container){
                return (new SiteWorks($container))->worksPage($request, $response);
            })
            ->setName('works');

        $group->get('/work/{id}',
            function(Request $request, Response $response) use ($container){
                return (new SiteWorks($container))->workPage($request, $response);
            })
            ->setName('work');

        $group->get('/work/{work}/chunk/{chunk}',
            function(Request $request, Response $response) use ($container){
                return (new SiteChunkPage($container))->singleChunkPage($request, $response);
            })
            ->setName('chunk');

        // COLLATION TABLES
        // Collation table with preset
        $group->get('/collation/auto/{work}/{chunk}/preset/{preset}',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->automaticCollationPagePreset($request, $response);
            })
            ->setName('chunk.collationtable.preset');

        // Collation table with parameters in Url
        $group->get('/collation/auto/{work}/{chunk}/{lang}[/{ignore_punct}[/{witnesses:.*}]]',
            function(Request $request, Response $response, $args) use ($container){
                return (new SiteCollationTable($container))->automaticCollationPageGet($request, $response, $args);
            })
            ->setName('chunk.collationtable');

        // Collation table with full options in post
        $group->post('/collation/auto/{work}/{chunk}/{lang}/custom',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->automaticCollationPageCustom($request, $response);
            })
            ->setName('chunk.collationtable.custom');

        // edit collation table
        $group->get('/collation/edit/{tableId}[/{versionId}]',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->editCollationTable($request, $response);
            })
            ->setName('collationtable.edit');

        // EDITION
        $group->get('/edition/chunk/edit/{tableId}[/{type}]',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->editCollationTable($request, $response);
            })->setName('chunkedition.edit');


        // MULTI-CHUNK EDITION
        $group->get('/edition/multi/new',
            function(Request $request, Response $response) use ($container){
                return (new SiteMultiChunkEdition($container))->newMultiChunkEdition($response);
            }
        )->setName('mce.new');

        $group->get('/edition/multi/edit/{editionId}',
            function(Request $request, Response $response) use ($container){
                return (new SiteMultiChunkEdition($container))->getMultiChunkEdition($request, $response);
            }
        )->setName('mce.edit');

        // DOCS

        $group->get('/documents',
            function(Request $request, Response $response) use ($container){
                return (new SiteDocuments($container))->documentsPage($request, $response);
            })
            ->setName('docs');

        $group->get('/doc/{id}/details',
            function(Request $request, Response $response) use ($container){
                return (new SiteDocuments($container))->showDocPage($request, $response);
            })
            ->setName('doc.showdoc');

        $group->get('/doc/{id}/definepages',
            function(Request $request, Response $response) use ($container){
                return (new SiteDocuments($container))->defineDocPages($request, $response);
            })
            ->setName('doc.definedocpages');

        $group->get('/doc/{id}/edit',
            function(Request $request, Response $response) use ($container){
                return (new SiteDocuments($container))->editDocPage($request, $response);
            })
            ->setName('doc.editdoc');

        $group->get('/doc/new',
            function(Request $request, Response $response) use ($container){
                return (new SiteDocuments($container))->newDocPage($request, $response);
            })
            ->setName('doc.new');

        // PAGE VIEWER / TRANSCRIPTION EDITOR
        $group->get('/doc/{doc}/realpage/{page}/view',
            function(Request $request, Response $response) use ($container){
                return (new SitePageViewer($container))->pageViewerPageByDocPage($request, $response);
            })
            ->setName('pageviewer.docpage');

        $group->get('/doc/{doc}/page/{seq}/view[/c/{col}]',
            function(Request $request, Response $response) use ($container){
                return (new SitePageViewer($container))->pageViewerPageByDocSeq($request, $response);
            })
            ->setName('pageviewer.docseq');

    })->add( function(Request $request, RequestHandlerInterface $handler) use($container){
        return (new Authenticator($container))->authenticateSiteRequest($request, $handler);
    });
}

function createAuthenticatedApiRoutes(App $app, ContainerInterface $container) : void {
    $app->group('/api', function (RouteCollectorProxy $group) use ($container){

        createApiEntityRoutes($group, 'entity', $container);
        // SEARCH
        $group->post('/search/keyword',
            function(Request $request, Response $response) use ($container){
                return (new ApiSearch($container))->search($request, $response);
            })
            ->setName('search.keyword');

        $group->post('/search/transcriptions',
            function(Request $request, Response $response) use ($container){
                return (new ApiSearch($container))->getTranscriptionTitles($request, $response);
            })
            ->setName('search.titles');

        $group->post('/search/transcribers',
            function(Request $request, Response $response) use ($container){
                return (new ApiSearch($container))->getTranscribers($request, $response);
            })
            ->setName('search.transcribers');

        $group->post('/search/editions',
            function(Request $request, Response $response) use ($container){
                return (new ApiSearch($container))->getEditionTitles($request, $response);
            })
            ->setName('search.editions');

        $group->post('/search/editors',
            function(Request $request, Response $response) use ($container){
                return (new ApiSearch($container))->getEditors($request, $response);
            })
            ->setName('search.editors');

        // LOG
        $group->post('/admin/log',
            function(Request $request, Response $response) use ($container){
                return (new ApiLog($container))->frontEndLog($request, $response);
            })
            ->setName('api.admin.log');

        // TRANSCRIPTIONS

        // get pages transcribed by user
        $group->get('/transcriptions/byUser/{userTid}/docPageData',
            function(Request $request, Response $response) use ($container){
                return (new ApiUsers($container))->getTranscribedPages($request, $response);
            })
            ->setName('api.transcriptions.byUser.docPageData');

        //  getElements
        $group->get('/transcriptions/{document}/{page}/{column}/get',
            function(Request $request, Response $response) use ($container){
                return (new ApiElements($container))->getElementsByDocPageCol($request, $response);
            })
            ->setName('api.transcriptions.getData');

        //   getElements (with version Id)
        // TODO: merge this with previous
        $group->get('/transcriptions/{document}/{page}/{column}/get/version/{version}',
            function(Request $request, Response $response) use ($container){
                return (new ApiElements($container))->getElementsByDocPageCol($request, $response);
            })
            ->setName('api.transcriptions.getData.withVersion');

        // updateColumnElements
        $group->post('/transcriptions/{document}/{page}/{column}/update',
            function(Request $request, Response $response) use ($container){
                return (new ApiElements($container))->updateElementsByDocPageCol($request, $response);
            })
            ->setName('api.transcriptions.update');


        // DOCUMENTS

        // API -> create new document
        $group->post('/doc/new',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->newDocument($request, $response);
            })
            ->setName('api.doc.new');

        // API -> delete document
        $group->get('/doc/{id}/delete',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->deleteDocument($request, $response);
            })
            ->setName('api.doc.delete');

        // API -> add pages to a document
        $group->post('/doc/{id}/addpages',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->addPages($request, $response);
            })
            ->setName('api.doc.addpages');

        // API -> update document settings
        $group->post('/doc/{id}/update',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->updateDocSettings($request, $response);
            })
            ->setName('api.doc.update');

        // API -> numColumns
        $group->get('/{document}/{page}/numcolumns',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->getNumColumns($request, $response);
            })
            ->setName('api.numcolumns');

        // API -> pageTypes

        $group->get('/page/types',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->getPageTypes($request, $response);
            })
            ->setName('api.page.types');


        // API -> updatePageSettings
        $group->post('/page/{pageId}/update',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->updatePageSettings($request, $response);
            })
            ->setName('api.updatepagesettings');

        $group->post('/page/bulkupdate',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->updatePageSettingsBulk($request, $response);
            })
            ->setName('api.updatepagesettings.bulk');

        // API -> numColumns
        $group->get('/{document}/{page}/newcolumn',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->addNewColumn($request, $response);
            })
            ->setName('api.newcolumn');

        // API -> getPageInfo
        $group->post('/pages/info',
            function(Request $request, Response $response) use ($container){
                return (new ApiDocuments($container))->getPageInfo($request, $response);
            })
            ->setName('api.getPageInfo');

        // WORKS

        // API -> work : get work info
        $group->get('/work/{workId}/old-info',
            function(Request $request, Response $response) use ($container){
                return (new ApiWorks($container))->getWorkInfoOld($request, $response);
            })
            ->setName('api.work.info');

        $group->get('/work/{workId}/data',
            function(Request $request, Response $response) use ($container){
                return (new ApiWorks($container))->getWorkData($request, $response);
            })
            ->setName('api.work.data');

        $group->get('/work/{workId}/chunksWithTranscription',
            function(Request $request, Response $response) use ($container){
                return (new ApiWorks($container))->getChunksWithTranscription($request, $response);
            })
            ->setName('api.work.chunksWithTranscription');

        //  PERSON

        $group->get('/person/all/data/essential',
            function(Request $request, Response $response) use ($container){
                return (new ApiPeople($container))->getAllPeopleEssentialData($request, $response);
            })
            ->setName('api.person.data.essential.all');

        $group->get('/person/{tid}/data/essential',
            function(Request $request, Response $response) use ($container){
                return (new ApiPeople($container))->getPersonEssentialData($request, $response);
            })
            ->setName('api.person.data.essential');

        $group->get('/person/{tid}/works',
            function(Request $request, Response $response) use ($container){
                return (new ApiPeople($container))->getWorks($request, $response);
            })
            ->setName('api.person.works');

        $group->post('/person/create',
            function(Request $request, Response $response) use ($container){
                return (new ApiPeople($container))->createNewPerson($request, $response);
            })
            ->setName('api.person.create');

        // USERS
        // API -> user : update profile
        $group->post('/user/{userTid}/update',
            function(Request $request, Response $response) use ($container){
                return (new ApiUsers($container))->updateUserProfile($request, $response);
            })
            ->setName('api.user.update');

        $group->post('/user/create/{personTid}',
            function(Request $request, Response $response) use ($container){
                return (new ApiUsers($container))->createNewUser($request, $response);
            })
            ->setName('api.user.create');

        // API -> user : get collation tables (and chunk edition) by user
        $group->get('/user/{userTid}/collationTables',
            function(Request $request, Response $response) use ($container){
                return (new ApiUsers($container))->getCollationTableInfo($request, $response);
            })
            ->setName('api.user.collationTables');

        // API -> user : get multi-chunk editions by user
        $group->get('/user/{userTid}/multiChunkEditions',
            function(Request $request, Response $response) use ($container){
                return (new ApiUsers($container))->getMultiChunkEditionsByUser($request, $response);
            })
            ->setName('api.user.multiChunkEditions');

        // WITNESSES
        $group->get('/witness/get/{witnessId}[/{outputType}[/{cache}]]',
            function(Request $request, Response $response) use ($container){
                return (new ApiWitness($container))->getWitness($request, $response);
            })
            ->setName('api.witness.get');

        $group->post('/witness/check/updates',
            function(Request $request, Response $response) use ($container){
                return (new ApiWitness($container))->checkWitnessUpdates($request, $response);
            })
            ->setName('api.witness.check.updates');

        $group->get('/witness/{witnessId}/to/edition',
            function(Request $request, Response $response) use ($container){
                return (new ApiCollation($container))->convertWitnessToEdition($request, $response);
            })->setName('api.witness.convert.to.edition');

        // COLLATION TABLES

        $group->post('/collation/auto',
            function(Request $request, Response $response) use ($container){
                return (new ApiCollation($container))->automaticCollation($request, $response);
            })
            ->setName('api.collation.auto');

        $group->post('/collation/save',
            function(Request $request, Response $response) use ($container){
                return (new ApiCollation($container))->saveCollationTable($request, $response);
            })
            ->setName('api.collation.save');

        $group->post('/collation/convert/{tableId}',
            function(Request $request, Response $response) use ($container){
                return (new ApiCollationTableConversion($container))->convertTable($request, $response);
            })
            ->setName('api.collation.convert');

        $group->get('/collation/get/{tableId}[/{timestamp}]',
            function(Request $request, Response $response) use ($container){
                return (new ApiCollation($container))->getTable($request, $response);
            })
            ->setName('api.collation.get');

        $group->get('/collation/info/edition/active',
            function(Request $request, Response $response) use ($container){
                return (new ApiCollation($container))->getActiveEditions($response);
            })
            ->setName('api.collation.info.edition.active');

        // EDITION SOURCES

        $group->get('/edition/sources/all',
            function(Request $request, Response $response) use ($container){
                return (new ApiEditionSources($container))->getAllSources($request, $response);
            })
            ->setName('api.edition_sources.get_all');


        $group->get('/edition/source/get/{tid}',
            function(Request $request, Response $response) use ($container){
                return (new ApiEditionSources($container))->getSourceByTid($request, $response);
            })
            ->setName('api.edition_sources.get');

        // MULTI CHUNK EDITION

        $group->get('/edition/multi/get/{editionId}[/{timestamp}]',
            function(Request $request, Response $response, array $args) use ($container){
                return (new ApiMultiChunkEdition($container))->getEdition($request, $response, $args);
            })->setName('api.multi_chunk.get');

        $group->post('/edition/multi/save',
            function(Request $request, Response $response) use ($container){
                return (new ApiMultiChunkEdition($container))->saveEdition($request, $response);
            })
            ->setName('api.multi_chunk.save');

        //  EDITION ENGINE

        // TODO: check this, most likely obsolete
        $group->post('/edition/auto',
            function(Request $request, Response $response) use ($container){
                return (new ApiEditionEngine($container))->automaticEditionEngine($request, $response);
            })
            ->setName('api.edition.auto');

        // TYPESETTING

        $group->post('/typeset/raw',
            function(Request $request, Response $response) use ($container){
                return (new ApiTypesetPdf($container))->typesetRawData($request, $response);
            })
            ->setName('api.typeset.raw');

        //  PRESETS

        $group->post('/presets/get',
            function(Request $request, Response $response) use ($container){
                return (new ApiPresets($container))->getPresets($request, $response);
            })
            ->setName('api.presets.get');

        $group->get('/presets/delete/{id}',
            function(Request $request, Response $response) use ($container){
                return (new ApiPresets($container))->deletePreset($request, $response);
            })
            ->setName('api.presets.delete');

        $group->post('/presets/sigla/get',
            function(Request $request, Response $response) use ($container){
                return (new ApiPresets($container))->getSiglaPresets($request, $response);
            })
            ->setName('api.presets.sigla.get');

        $group->post('/presets/sigla/save',
            function(Request $request, Response $response) use ($container){
                return (new ApiPresets($container))->saveSiglaPreset($request, $response);
            })
            ->setName('api.presets.sigla.save');

        $group->post('/presets/act/get',
            function(Request $request, Response $response) use ($container){
                return (new ApiPresets($container))->getAutomaticCollationPresets($request, $response);
            })
            ->setName('api.presets.act.get');

        $group->post('/presets/post',
            function(Request $request, Response $response) use ($container){
                return (new ApiPresets($container))->savePreset($request, $response);
            })
            ->setName('api.presets.post');

        createApiImageRoutes($group, 'images', $container);

    })->add( function(Request $request, RequestHandlerInterface $handler) use($container){
        return (new Authenticator($container))->authenticateApiRequest($request, $handler);
    });
}

function createApiEntityRoutes(RouteCollectorProxy $group, string $prefix, ContainerInterface $container) : void
{
    $group->get("/$prefix/type/{entityType}/schema",function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getEntitySchema($request, $response);
    })->setName("api.$prefix.type.schema");

    $group->get("/$prefix/data/{tid}",function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getEntityData($request, $response);
    })->setName("api.$prefix.data");
}

function createApiImageRoutes(RouteCollectorProxy $group, string $prefix, ContainerInterface $container) : void
{

    // API -> images : Mark Icon
    $group->get("/$prefix/mark/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateMarkIcon($request, $response);
        })
        ->setName("api.$prefix.mark");

    // API -> images : No Word Break Icon
    $group->get("/$prefix/nowb/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateNoWordBreakIcon($request, $response);
        })
        ->setName("api.$prefix.nowb");

    // API -> images : Illegible Icon
    $group->get("/$prefix/illegible/{size}/{length}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateIllegibleIcon($request, $response);
        })
        ->setName("api.$prefix.illegible");

    // API -> images : ChunkMark Icon
    $group->get("/$prefix/chunkmark/{dareid}/{chunkno}/{lwid}/{segment}/{type}/{dir}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateChunkMarkIcon($request, $response);
        })
        ->setName("api.$prefix.chunkmark");

    // API -> images : ChapterMark Icon
    $group->get("/$prefix/chaptermark/{work}/{level}/{number}/{type}/{dir}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateChapterMarkIcon($request, $response);
        })
        ->setName("api.$prefix.chaptermark");

    // API -> images : Line Gap Mark
    $group->get("/$prefix/linegap/{count}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateLineGapImage($request, $response);
        })
        ->setName("api.$prefix.linegap");

    // API -> images : Character Gap Mark
    $group->get("/$prefix/charactergap/{length}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateCharacterGapImage($request, $response);
        })
        ->setName("api.$prefix.charactergap");

    // API -> images : Paragraph Mark
    $group->get("/$prefix/paragraphmark/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateParagraphMarkIcon($request, $response);
        })
        ->setName("api.$prefix.charactergap");

}

function createLoginRoutes(App $app, ContainerInterface $container) : void {
    $app->any('/login',
        function(Request $request, Response $response) use ($container){
            return (new Authenticator($container))->login($request, $response);
        })
        ->setName('login');

    $app->any('/logout',
        function(Request $request, Response $response) use ($container){
            return (new Authenticator($container))->logout($request, $response);
        })
        ->setName('logout');
}

function createDareApiRoutes(App $app, ContainerInterface $container) : void {
    $app->group('/api/data', function(RouteCollectorProxy $group) use($container){
        // get list of transcriptions available for download
        $group->get('/transcription/list',
            function(Request $request, Response $response) use ($container){
                return (new ApiTranscription($container))->getList($request, $response);
            });

        // get the transcription for a given document and page
        $group->get('/transcription/get/{docId}/{page}',
            function(Request $request, Response $response) use ($container){
                return (new ApiTranscription($container))->getTranscription($request, $response);
            });
    })->add( function(Request $request, RequestHandlerInterface $handler) use($container){
        return (new Authenticator($container))->authenticateDataApiRequest($request, $handler);
    });
}