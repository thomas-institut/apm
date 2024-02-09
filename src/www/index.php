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
$phpLog = new ErrorLogHandler();
$logger->pushHandler($phpLog);

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
$responseFactory = new ResponseFactory();
$app = new App($responseFactory, $container);
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

loginLogoutRoutes($app, $container);


// AUTHENTICATED SITE ACCESS

$app->group('', function (RouteCollectorProxy $group) use ($container){

    // HOME

    $group->get('/',
        function(Request $request, Response $response) use ($container){
            $siteHomePage = new SiteHomePage($container);
            return $siteHomePage->homePage($request, $response);
        })
        ->setName('home');

    // Search Page

    $group->get('/search',
        SiteSearch::class . ':searchPage')
        ->setName('search');

    // People and Person Pages

    $group->get('/people',
        function(Request $request, Response $response) use ($container){
            $controller = new SitePeople($container);
            return $controller->peoplePage($request, $response);
        })
        ->setName('people');

    $group->get('/person/{tid}',
        function(Request $request, Response $response) use ($container){
            $controller = new SitePeople($container);
            return $controller->personPage($request, $response);
        })
        ->setName('person');


    // DASHBOARD

    $group->get('/dashboard',
        function(Request $request, Response $response) use ($container){
            $dashboard = new SiteDashboard($container);
            return $dashboard->DashboardPage($request, $response);
        })
        ->setName('dashboard');

    // WORKS

    $group->get('/works',
        SiteChunks::class . ':worksPage')
        ->setName('works');

    $group->get('/work/{work}/chunk/{chunk}',
        function(Request $request, Response $response) use ($container){
            $c = new SiteChunkPage($container);
            return $c->singleChunkPage($request, $response);
        })->setName('chunk');

//
//    $group->get('/chunks/map[/{timestamp}]',
//        SiteChunks::class . ':fullTxMapPage')
//        ->setName('fullTxMap');

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
    $group->get('/collation/edit/{tableId}[/{versionId}]',
        SiteCollationTable::class . ':editCollationTable')
        ->setName('collationtable.edit');

    // EDITION
    $group->get('/edition/chunk/edit/{tableId}[/{type}]',
        function(Request $request, Response $response) use ($container){
        $c = new SiteCollationTable($container);
        return $c->editCollationTable($request, $response);
    })->setName('chunkedition.edit');


    // MULTI-CHUNK EDITION
    $group->get('/edition/multi/new',
        function(Request $request, Response $response) use ($container){
            $c = new SiteMultiChunkEdition($container);
            return $c->newMultiChunkEdition($response);
        }
       )->setName('mce.new');

    $group->get('/edition/multi/edit/{editionId}',
        function(Request $request, Response $response) use ($container){
            $c = new SiteMultiChunkEdition($container);
            return $c->getMultiChunkEdition($request, $response);
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
        function(Request $request, Response $response) use ($container){
            $c = new SitePageViewer($container);
            return $c->pageViewerPageByDocPage($request, $response);
        })->setName('pageviewer.docpage');

    $group->get('/doc/{doc}/page/{seq}/view[/c/{col}]', function(Request $request, Response $response) use ($container){
        $c = new SitePageViewer($container);
        return $c->pageViewerPageByDocSeq($request, $response);
    })->setName('pageviewer.docseq');

})->add( function(Request $request, RequestHandlerInterface $handler) use($container){
    $authenticator = new Authenticator($container);
    return $authenticator->authenticateSiteRequest($request, $handler);
});



// -----------------------------------------------------------------------------
//  API ROUTES
// -----------------------------------------------------------------------------

// USER AUTHENTICATED API, i.e., calls from JS apps

$app->group('/api', function (RouteCollectorProxy $group) use ($container){

    // SEARCH
     $group->post('/search/keyword',
        ApiSearch::class . ':search')
        ->setName('search.keyword');

    $group->post('/search/transcriptions',
        ApiSearch::class . ':getTranscriptionTitles')
        ->setName('search.titles');

    $group->post('/search/transcribers',
        ApiSearch::class . ':getTranscribers')
        ->setName('search.transcribers');

    $group->post('/search/editions',
        ApiSearch::class . ':getEditionTitles')
        ->setName('search.editions');

    $group->post('/search/editors',
        ApiSearch::class . ':getEditors')
        ->setName('search.editors');

    // People
//    $group->post('/person/get',
//        ApiPeople::class . ':getData')
//        ->setName('getData');
//
//    $group->post('/person/save',
//        ApiPeople::class . ':saveData')
//        ->setName('saveData');
//
//    $group->post('/person/create',
//        ApiPeople::class . ':saveData')
//        ->setName('createPerson');
//
//    $group->post('/person/schema',
//        ApiPeople::class . ':getSchema')
//        ->setName('getSchema');
//
//    $group->post('/person/newid',
//        ApiPeople::class . ':getNewId')
//        ->setName('getNewId');
//
//    $group->post('/people/all',
//        ApiPeople::class . ':getAllPeople')
//        ->setName('getAllPeople');

    // LOG
    $group->post('/admin/log',
        function(Request $request, Response $response) use ($container){
            $ac = new ApiLog($container);
            return $ac->frontEndLog($request, $response);
        })
        ->setName('api.admin.log');

    // TRANSCRIPTIONS

    // get pages transcribed by user
    $group->get('/transcriptions/byUser/{userId}/docPageData', function(Request $request, Response $response) use ($container){
        $apiUsers = new ApiUsers($container);
        return $apiUsers->getTranscribedPages($request, $response);
    } )->setName('api.transcriptions.byUser.docPageData');

    //  getElements
    $group->get('/transcriptions/{document}/{page}/{column}/get',
        function(Request $request, Response $response) use ($container){
            $ac = new ApiElements($container);
            return $ac->getElementsByDocPageCol($request, $response);
        })
        ->setName('api.transcriptions.getData');

    //   getElements (with version Id)
    // TODO: merge this with previous
    $group->get('/transcriptions/{document}/{page}/{column}/get/version/{version}',
        function(Request $request, Response $response) use ($container){
            $ac = new ApiElements($container);
            return $ac->getElementsByDocPageCol($request, $response);
        })
        ->setName('api.transcriptions.getData.withVersion');

    // updateColumnElements
    $group->post('/transcriptions/{document}/{page}/{column}/update',
        function(Request $request, Response $response) use ($container){
            $ac = new ApiElements($container);
            return $ac->updateElementsByDocPageCol($request, $response);
        })
        ->setName('api.transcriptions.update');


    // DOCUMENTS

     // API -> create new document
    $group->post('/doc/new',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->newDocument($request, $response);
    })->setName('api.doc.new');

    // API -> delete document
    $group->get('/doc/{id}/delete',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->deleteDocument($request, $response);
    })->setName('api.doc.delete');

    // API -> add pages to a document
     $group->post('/doc/{id}/addpages',function(Request $request, Response $response) use ($container){
         $ac = new ApiDocuments($container);
         return $ac->addPages($request, $response);
     })->setName('api.doc.addpages');

    // API -> update document settings
    $group->post('/doc/{id}/update',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->updateDocSettings($request, $response);
    })->setName('api.doc.update');

    // API -> numColumns
    $group->get('/{document}/{page}/numcolumns',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->getNumColumns($request, $response);
    })->setName('api.numcolumns');

    // API -> pageTypes

    $group->get('/page/types',  function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->getPageTypes($request, $response);
    })->setName('api.page.types');


    // API -> updatePageSettings
    $group->post('/page/{pageId}/update',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->updatePageSettings($request, $response);
    })->setName('api.updatepagesettings');

    $group->post('/page/bulkupdate',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->updatePageSettingsBulk($request, $response);
    })->setName('api.updatepagesettings.bulk');

    // API -> numColumns
    $group->get('/{document}/{page}/newcolumn',function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->addNewColumn($request, $response);
    })->setName('api.newcolumn');

    // API -> getPageInfo
    $group->post('/pages/info', function(Request $request, Response $response) use ($container){
        $ac = new ApiDocuments($container);
        return $ac->getPageInfo($request, $response);
    })->setName('api.getPageInfo');

    // WORKS

    // API -> work : get work info
    $group->get('/work/{workId}/info',
        function(Request $request, Response $response) use ($container){
            $apiWorks = new ApiWorks($container);
            return $apiWorks->getWorkInfo($request, $response);
        })
        ->setName('api.work.info');

    //  PERSON

    $group->get('/person/all/data/essential',
        function(Request $request, Response $response) use ($container){
            $apiPeople = new ApiPeople($container);
            return $apiPeople->getAllPeopleEssentialData($request, $response);
        })
        ->setName('api.person.data.essential.all');

    $group->get('/person/{tid}/data/essential',
        function(Request $request, Response $response) use ($container){
            $apiPeople = new ApiPeople($container);
            return $apiPeople->getPersonEssentialData($request, $response);
        })
        ->setName('api.person.data.essential');

    $group->post('/person/create',
        function(Request $request, Response $response) use ($container){
            $apiPeople = new ApiPeople($container);
            return $apiPeople->createNewPerson($request, $response);
        })
        ->setName('api.person.create');

    // USERS




    // API -> user : update profile
    $group->post('/user/{userTid}/update',
        function(Request $request, Response $response) use ($container){
            $apiUsers = new ApiUsers($container);
            return $apiUsers->updateUserProfile($request, $response);
        })
        ->setName('api.user.update');

    $group->post('/user/create/{personTid}',
        function(Request $request, Response $response) use ($container){
            $apiUsers = new ApiUsers($container);
            return $apiUsers->createNewUser($request, $response);
        })
        ->setName('api.user.create');

    // API -> user : get collation tables (and chunk edition) by user
    $group->get('/user/{userTid}/collationTables', function(Request $request, Response $response) use ($container){
        $apiUsers = new ApiUsers($container);
        return $apiUsers->getCollationTableInfo($request, $response);
    } )->setName('api.user.collationTables');

    // API -> user : get multi-chunk editions by user
    $group->get('/user/{userTid}/multiChunkEditions', function(Request $request, Response $response) use ($container){
        $apiUsers = new ApiUsers($container);
        return $apiUsers->getMultiChunkEditionsByUser($request, $response);
    } )->setName('api.user.multiChunkEditions');



    // WITNESSES
    $group->get('/witness/get/{witnessId}[/{outputType}[/{cache}]]',
        ApiWitness::class . ':getWitness')
        ->setName('api.witness.get');

    $group->post('/witness/check/updates',
        ApiWitness::class . ':checkWitnessUpdates')
        ->setName('api.witness.check.updates');

    $group->get('/witness/{witnessId}/to/edition',
        function(Request $request, Response $response) use ($container){
            $apiC = new ApiCollation($container);
            return $apiC->convertWitnessToEdition($request, $response);
        })->setName('api.witness.convert.to.edition');

    // COLLATION TABLES

    $group->post('/collation/auto',function(Request $request, Response $response) use ($container){
        $apiC = new ApiCollation($container);
        return $apiC->automaticCollation($request, $response);
    })->setName('api.collation.auto');

    $group->post('/collation/save',
        function(Request $request, Response $response) use ($container){
            $apiC = new ApiCollation($container);
            return $apiC->saveCollationTable($request, $response);
        })
        ->setName('api.collation.save');

    $group->post('/collation/convert/{tableId}',
        ApiCollationTableConversion::class
    )->setName('api.collation.convert');

    $group->get('/collation/get/{tableId}[/{timestamp}]',  function(Request $request, Response $response) use ($container){
        $apiC = new ApiCollation($container);
        return $apiC->getTable($request, $response);
    })->setName('api.collation.get');

    $group->get('/collation/info/edition/active',  function(Request $request, Response $response) use ($container){
        $apiC = new ApiCollation($container);
        return $apiC->getActiveEditions($response);
    })->setName('api.collation.info.edition.active');


    // EDITION SOURCES

    $group->get('/edition/sources/all',
        function(Request $request, Response $response) use ($container){
            $apiC = new ApiEditionSources($container);
            return $apiC->getAllSources($request, $response);
        })->setName('api.edition_sources.get_all');


    $group->get('/edition/source/get/{tid}',
        function(Request $request, Response $response) use ($container){
            $apiC = new ApiEditionSources($container);
            return $apiC->getSourceByTid($request, $response);
        })->setName('api.edition_sources.get');

    // MULTI CHUNK EDITION

    $group->get('/edition/multi/get/{editionId}[/{timestamp}]',
        function(Request $request, Response $response, array $args) use ($container){
            $apiC = new ApiMultiChunkEdition($container);
            return $apiC->getEdition($request, $response, $args);
        })->setName('api.multi_chunk.get');

    $group->post('/edition/multi/save', function(Request $request, Response $response) use ($container){
        $apiC = new ApiMultiChunkEdition($container);
        return $apiC->saveEdition($request, $response);
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

})->add( function(Request $request, RequestHandlerInterface $handler) use($container){
    $authenticator = new Authenticator($container);
    return $authenticator->authenticateApiRequest($request, $handler);
});

//  API for DARE

$app->group('/api/data', function(RouteCollectorProxy $group){
    // get list of transcriptions available for download
    $group->get('/transcription/list', ApiTranscription::class . ':getList');

    // get the transcription for a given document and page
    $group->get('/transcription/get/{docId}/{page}', ApiTranscription::class . ':getTranscription');
})->add( function(Request $request, RequestHandlerInterface $handler) use($container){
    $authenticator = new Authenticator($container);
    return $authenticator->authenticateDataApiRequest($request, $handler);
});

// -----------------------------------------------------------------------------
//  RUN!
// -----------------------------------------------------------------------------
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


function loginLogoutRoutes(App $app, ContainerInterface $container) : void {
    $app->any('/login',
        function(Request $request, Response $response) use ($container){
            $authenticator = new Authenticator($container);
            return $authenticator->login($request, $response);
        })
        ->setName('login');

    $app->any('/logout',
        function(Request $request, Response $response) use ($container){
            $authenticator = new Authenticator($container);
            return $authenticator->logout($request, $response);
        })
        ->setName('logout');
}