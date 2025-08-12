<?php
/*
 *  Copyright (C) 2016-2025 Universität zu Köln
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
use APM\Api\ApiSearch;
use APM\Api\ApiSystem;
use APM\Api\ApiWorks;
use APM\Site\SiteEntity;
use APM\Site\SiteMetadataEditor;
use APM\Site\SiteMultiChunkEdition;
use APM\Site\SitePeople;
use APM\Site\SiteSearch;
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

use APM\System\Auth\Authenticator;

use APM\Api\ApiIcons;
use APM\Api\ApiDocuments;
use APM\Api\ApiUsers;
use APM\Api\ApiCollation;
use APM\Api\ApiPresets;
use APM\Api\ApiElements;
use APM\Api\ApiCollationTableConversion;
use APM\Api\ApiTypesetPdf;
use APM\Api\ApiWitness;
use ThomasInstitut\MinimalContainer\MinimalContainer;
use Twig\Error\LoaderError;

error_reporting(E_ERROR | E_PARSE | E_NOTICE);
// Load system profiler first
require 'classes/APM/SystemProfiler.php';
SystemProfiler::start();

// autoload
require 'vendor/autoload.php';


$config = SystemConfig::get();
if (!is_array($config)) {
    exitWithErrorMessage($config);
}
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
$container->set(ApmContainerKey::SITE_USER_ID, -1); // set by authenticator
$container->set(ApmContainerKey::API_USER_ID, -1); // set by authenticator

// Setup Slim App
$app = new App(new ResponseFactory(), $container);

// setup app's basePath if necessary
$subDir = $config['subDir'];

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


// Create routes
createLoginRoutes($app, $container);
createSiteRoutes($app, $container);
createSiteDevRoutes($app, $container);
createApiAuthenticatedRoutes($app, $container);

// RUN!!
SystemProfiler::lap('Ready');
$app->run();

/**
 * Exits with an error message
 * @param string $msg
 */
#[NoReturn] function exitWithErrorMessage(string $msg): void
{
    http_response_code(500);
    print "<pre>SERVER ERROR: $msg</pre>";
    exit();
}

function createSiteRoutes(App $app, ContainerInterface $container) : void
{
    $app->group('', function (RouteCollectorProxy $group) use ($container){
        // HOME
        $group->get('/',
            function(Request $request, Response $response) use ($container){
                return (new SiteHomePage($container))->homePage($response);
            })
            ->setName('home');

        // Search Page
//        $group->get('/search',
//            function(Request $request, Response $response) use ($container){
//                return (new SiteSearch($container))->searchPage($request, $response);
//            })
//            ->setName('search');

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

        $group->get('/person/{id}',
            function(Request $request, Response $response) use ($container){
                return (new SitePeople($container))->personPage($request, $response);
            })
            ->setName('person');

        // Entity admin page
        $group->get('/entity/{tid}/admin',
            function(Request $request, Response $response) use ($container){
                return (new SiteEntity($container))->adminEntityPage($request, $response);
            })
            ->setName('entity');

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
        $group->get('/collation-table/auto/{work}/{chunk}/preset/{preset}',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->automaticCollationPagePreset($request, $response);
            })
            ->setName('chunk.collation-table.preset');

        // Collation table with parameters in Url
        $group->get('/collation-table/auto/{work}/{chunk}/{lang}[/{ignore_punct}[/{witnesses:.*}]]',
            function(Request $request, Response $response, $args) use ($container){
                return (new SiteCollationTable($container))->automaticCollationPageGet($request, $response, $args);
            })
            ->setName('chunk.collation-table');

        // Collation table with full options in post
        $group->post('/collation-table/auto/{work}/{chunk}/{lang}/custom',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->automaticCollationPageCustom($request, $response);
            })
            ->setName('chunk.collation-table.custom');

        // edit collation table
        $group->get('/collation-table/{tableId}[/{versionId}]',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->editCollationTable($request, $response);
            })
            ->setName('collation-table.edit');

        // CHUNK EDITION
        $group->get('/chunk-edition/new/{workId}/{chunkNumber}/{lang}',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->newChunkEdition($request, $response);
            })->setName('chunk-edition.new');

        $group->get('/chunk-edition/{tableId}[/{type}]',
            function(Request $request, Response $response) use ($container){
                return (new SiteCollationTable($container))->editCollationTable($request, $response);
            })->setName('chunk-edition.edit');


        // MULTI-CHUNK EDITION
        $group->get('/multi-chunk-edition/new',
            function(Request $request, Response $response) use ($container){
                return (new SiteMultiChunkEdition($container))->newMultiChunkEdition($response);
            }
        )->setName('mce.new');

        $group->get('/multi-chunk-edition/{editionId}',
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


        // will be deprecated soon
        $group->get('/doc/{id}/definepages',
            function(Request $request, Response $response) use ($container){
                return (new SiteDocuments($container))->defineDocPages($request, $response);
            })
            ->setName('doc.definedocpages');


        // transcription editor
        $group->get('/doc/{doc}/page/{n}/view[/c/{col}]',
            function(Request $request, Response $response) use ($container){
                return (new SitePageViewer($container))->pageViewerPageByDoc($request, $response, false);
            })
            ->setName('doc.page.transcribe');

        // transcription editor (real pages)

        $group->get('/doc/{doc}/realPage/{n}/view[/c/{col}]',
            function(Request $request, Response $response) use ($container){
                return (new SitePageViewer($container))->pageViewerPageByDoc($request, $response, true);
            })
            ->setName('doc.page.transcribe.realPage');

        // show document
        $group->get('/doc/{id}[/{params:.*}]',
            function(Request $request, Response $response, array $args) use ($container){
                return (new SiteDocuments($container))->documentPage($request, $response, $args);
            })
            ->setName('doc.show');


    })->add( function(Request $request, RequestHandlerInterface $handler) use($container){
        return (new Authenticator($container))->authenticateSiteRequest($request, $handler);
    });
}
function createApiAuthenticatedRoutes(App $app, ContainerInterface $container) : void {
    $app->group('/api', function (RouteCollectorProxy $group) use ($container){

        // system
        createApiSystemRoutes($group, $container);
        // entity
        createApiEntityRoutes($group,  $container);
        // search
        createApiSearchRoutes($group, $container);
        // images
        createApiImageRoutes($group,  $container);
        // transcriptions
        createApiTranscriptionRoutes($group, $container);
        // work, works
        createApiWorksRoutes($group,$container);
        // presets
        createApiPresetsRoutes($group, $container);
        // doc, page, pages
        createApiDocAndPageRoutes($group, $container);
        // person
        createApiPersonRoutes($group, $container);
        // user
        createApiUsersRoutes($group, $container);
        // witness
        createApiWitnessRoutes($group, $container);
        // collation-table
        createApiCollationTableRoutes($group, $container);
        // edition
        createApiEditionRoutes($group, $container);
        // typeset
        createApiTypesettingRoutes($group, $container);
        // admin
        createApiAdminRoutes($group, $container);

    })->add( function(Request $request, RequestHandlerInterface $handler) use($container){
        return (new Authenticator($container))->authenticateApiRequest($request, $handler);
    });
}
function createApiEditionRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
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



}
function createApiCollationTableRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
    // COLLATION TABLES
    $group->post('/collation-table/auto',
        function(Request $request, Response $response) use ($container){
            return (new ApiCollation($container))->automaticCollation($request, $response);
        })
        ->setName('api.collation.auto');

    $group->post('/collation-table/save',
        function(Request $request, Response $response) use ($container){
            return (new ApiCollation($container))->saveCollationTable($request, $response);
        })
        ->setName('api.collation.save');

    $group->post('/collation-table/convert/{tableId}',
        function(Request $request, Response $response) use ($container){
            return (new ApiCollationTableConversion($container))->convertCollationTableToChunkEdition($request, $response);
        })
        ->setName('api.collation.convert');

    $group->get('/collation-table/get/{tableId}[/{timestamp}]',
        function(Request $request, Response $response) use ($container){
            return (new ApiCollation($container))->getTable($request, $response);
        })
        ->setName('api.collation.get');

    $group->get('/collation-table/versionInfo/{tableId}/{timestamp}',
        function(Request $request, Response $response) use ($container){
            return (new ApiCollation($container))->versionInfo($request, $response);
        })
        ->setName('api.collation.versionInfo');

    $group->get('/collation-table/info/edition/active',
        function(Request $request, Response $response) use ($container){
            return (new ApiCollation($container))->getActiveEditions($response);
        })
        ->setName('api.collation.info.edition.active');

    $group->get('/collation-table/active/work/{workId}',
        function (Request $request, Response $response) use ($container){
            return (new ApiCollation($container))->getActiveTablesForWork($request, $response);
        })
        ->setName('api.collation.active.work');
}
function createApiWitnessRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
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

}

function createApiSystemRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
    // LOG
    $group->get('/system/languages',
        function(Request $request, Response $response) use ($container){
            return (new ApiSystem($container))->getSystemLanguages($request, $response);
        })
        ->setName('api.system.languages');


    $group->get('/whoami', function(Request $request, Response $response) use ($container){
        return (new ApiSystem($container))->whoAmI($request, $response);
    })->setName('api.frontend.whoami');
}
function createApiAdminRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
    // LOG
    $group->post('/admin/log',
        function(Request $request, Response $response) use ($container){
            return (new ApiLog($container))->frontEndLog($request, $response);
        })
        ->setName('api.admin.log');
}
function createApiPersonRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
    //  PERSON
    $group->get('/person/all/dataForPeoplePage',
        function(Request $request, Response $response) use ($container){
            return (new ApiPeople($container))->getAllPeopleDataForPeoplePage($request, $response);
        })
        ->setName('api.person.data.essential.all');

    $group->get('/person/{tid}/data/essential',
        function(Request $request, Response $response) use ($container){
            return (new ApiPeople($container))->getPersonEssentialData($request, $response);
        })
        ->setName('api.person.data.essential');

    $group->get('/person/{tid}/works',
        function(Request $request, Response $response) use ($container){
            return (new ApiPeople($container))->getWorksByPerson($request, $response);
        })
        ->setName('api.person.works');

    $group->post('/person/create',
        function(Request $request, Response $response) use ($container){
            return (new ApiPeople($container))->createNewPerson($request, $response);
        })
        ->setName('api.person.create');
}
function createApiUsersRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {

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
}
function createApiDocAndPageRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
    // DOCUMENTS

    // API -> create new document
//    $group->post('/doc/new',
//        function(Request $request, Response $response) use ($container){
//            return (new ApiDocuments($container))->newDocumentOld($request, $response);
//        })
//        ->setName('api.doc.new');


    $group->get('/doc/getId/{docId}',
        function(Request $request, Response $response) use ($container){
        return (new ApiDocuments($container))->getDocId($request, $response);
    });

    $group->post('/doc/create',
        function(Request $request, Response $response, array $args) use ($container){
            return (new ApiDocuments($container))->createDocument($request, $response, $args);
        })
        ->setName('api.doc.create');

    // API -> add pages to a document
    $group->post('/doc/{id}/addpages',
        function(Request $request, Response $response) use ($container){
            return (new ApiDocuments($container))->addPages($request, $response);
        })
        ->setName('api.doc.addpages');


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

    // API -> newColumn
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
}
function createApiEntityRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void
{


    $group->get("/entity/statementQualificationObjects/data", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getValidQualificationObjects($request, $response, false);
    })->setName("api.entity.statementQualificationObjects.data");

    $group->get("/entity/statementQualificationObjects", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getValidQualificationObjects($request, $response, true);
    })->setName("api.entity.statementQualificationObjects");
    $group->get("/entity/{entityType}/entities", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getEntitiesForType($request, $response);
    })->setName("api.entity.entities");

    $group->get("/entity/{id}/predicateDefinitions", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getPredicateDefinitions($request, $response);
    })->setName("api.entity.predicateDefinitions");

    $group->get("/entity/{tid}/data", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->getEntityData($request, $response);
    })->setName("api.entity.data");

    $group->post("/entity/statements/edit", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->statementEdition($request, $response);
    })->setName("api.entity.statements.edit");

    $group->get("/entity/nameSearch/{inputString}/{typeList}", function(Request $request, Response $response) use ($container){
        return (new ApiEntity($container))->nameSearch($request, $response);
    })->setName("api.entity.nameSearch");

}
function createApiPresetsRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
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
}
function createApiImageRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void
{

    // API -> images : Mark Icon
    $group->get("/images/mark/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateMarkIcon($request, $response);
        })
        ->setName("api.images.mark");

    // API -> images : No Word Break Icon
    $group->get("/images/nowb/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateNoWordBreakIcon($request, $response);
        })
        ->setName("api.images.nowb");

    // API -> images : Illegible Icon
    $group->get("/images/illegible/{size}/{length}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateIllegibleIcon($request, $response);
        })
        ->setName("api.images.illegible");

    // API -> images : ChunkMark Icon
    $group->get("/images/chunkmark/{dareid}/{chunkno}/{lwid}/{segment}/{type}/{dir}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateChunkMarkIcon($request, $response);
        })
        ->setName("api.images.chunkmark");

    // API -> images : ChapterMark Icon
    $group->get("/images/chaptermark/{work}/{level}/{number}/{type}/{dir}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateChapterMarkIcon($request, $response);
        })
        ->setName("api.images.chaptermark");

    // API -> images : Line Gap Mark
    $group->get("/images/linegap/{count}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateLineGapImage($request, $response);
        })
        ->setName("api.images.linegap");

    // API -> images : Character Gap Mark
    $group->get("/images/charactergap/{length}/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateCharacterGapImage($request, $response);
        })
        ->setName("api.images.charactergap");

    // API -> images : Paragraph Mark
    $group->get("/images/paragraphmark/{size}",
        function(Request $request, Response $response) use ($container){
            return (new ApiIcons($container))->generateParagraphMarkIcon($request, $response);
        })
        ->setName("api.images.charactergap");

}
function createApiSearchRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
     $group->post("/search/keyword",
        function(Request $request, Response $response) use ($container){
            return (new ApiSearch($container))->search($request, $response);
        })
        ->setName('search.keyword');

    $group->any("/search/transcriptions",
        function(Request $request, Response $response) use ($container){
            return (new ApiSearch($container))->getTranscriptionTitles($request, $response);
        })
        ->setName('search.titles');

    $group->any("/search/transcribers",
        function(Request $request, Response $response) use ($container){
            return (new ApiSearch($container))->getTranscribers($request, $response);
        })
        ->setName('search.transcribers');

    $group->any("/search/editions",
        function(Request $request, Response $response) use ($container){
            return (new ApiSearch($container))->getEditionTitles($request, $response);
        })
        ->setName('search.editions');

    $group->any("/search/editors",
        function(Request $request, Response $response) use ($container){
            return (new ApiSearch($container))->getEditors($request, $response);
        })
        ->setName('search.editors');

}
function createApiTranscriptionRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {
    // TRANSCRIPTIONS

    // get pages transcribed by user
    $group->get("/transcriptions/byUser/{userTid}/docPageData",
        function(Request $request, Response $response) use ($container){
            return (new ApiUsers($container))->getTranscribedPages($request, $response);
        })
        ->setName('api.transcriptions.byUser.docPageData');

    //  getElements
    $group->get("/transcriptions/{document}/{page}/{column}/get",
        function(Request $request, Response $response) use ($container){
            return (new ApiElements($container))->getElementsByDocPageCol($request, $response);
        })
        ->setName('api.transcriptions.getData');

    //   getElements (with version Id)
    // TODO: merge this with previous
    $group->get("/transcriptions/{document}/{page}/{column}/get/version/{version}",
        function(Request $request, Response $response) use ($container){
            return (new ApiElements($container))->getElementsByDocPageCol($request, $response);
        })
        ->setName('api.transcriptions.getData.withVersion');

    // updateColumnElements
    $group->post("/transcriptions/{document}/{page}/{column}/update",
        function(Request $request, Response $response) use ($container){
            return (new ApiElements($container))->updateElementsByDocPageCol($request, $response);
        })
        ->setName('api.transcriptions.update');
}
function createApiWorksRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {

    // WORKS

    // API -> work: get work info
    $group->get("/work/{workId}/old-info",
        function(Request $request, Response $response) use ($container){
            return (new ApiWorks($container))->getWorkInfoOld($request, $response);
        })
        ->setName('api.work.info');

    $group->get("/work/{workId}/data",
        function(Request $request, Response $response) use ($container){
            return (new ApiWorks($container))->getWorkData($request, $response);
        })
        ->setName('api.work.data');

    $group->get("/work/{workId}/chunksWithTranscription",
        function(Request $request, Response $response) use ($container){
            return (new ApiWorks($container))->getChunksWithTranscription($request, $response);
        })
        ->setName('api.work.chunksWithTranscription');


    // AUTHORS

    $group->get("/works/authors", function(Request $request, Response $response) use ($container){
        return (new ApiWorks($container))->getAuthorList($request, $response);
    })
    ->setName('api.works.authors');
}
function createApiTypesettingRoutes(RouteCollectorProxy $group, ContainerInterface $container) : void {

    // TYPESETTING

    $group->post('/typeset/raw',
        function(Request $request, Response $response) use ($container){
            return (new ApiTypesetPdf($container))->generatePDF($request, $response);
        })
        ->setName('api.typeset.raw');
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
function createSiteDevRoutes(App $app, ContainerInterface $container) : void {

    $app->group("/dev", function (RouteCollectorProxy $group) use ($container){
        $group->get('/metadata-editor/{id}',
            function(Request $request, Response $response) use ($container){
                return (new SiteMetadataEditor($container))->metadataEditorPage($request, $response);
            })
            ->setName('metadata-editor');

        $group->get("/php-info", function(Request $request, Response $response){
            ob_start();
            phpinfo();
            $info = ob_get_contents();
            ob_end_clean();
            $response->getBody()->write($info);
            return $response;
        });

    })->add( function(Request $request, RequestHandlerInterface $handler) use($container){
        return (new Authenticator($container))->authenticateSiteRequest($request, $handler);
    });
}
