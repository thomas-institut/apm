<?php

use APM\Api\ApiCollationTable;
use APM\Api\ApiDocuments;
use APM\Api\ApiEditionSources;
use APM\Api\ApiElements;
use APM\Api\ApiEntity;
use APM\Api\ApiIcons;
use APM\Api\ApiLog;
use APM\Api\ApiMultiChunkEdition;
use APM\Api\ApiPeople;
use APM\Api\ApiPresets;
use APM\Api\ApiSearch;
use APM\Api\ApiSystem;
use APM\Api\ApiTypesetPdf;
use APM\Api\ApiUsers;
use APM\Api\ApiWitness;
use APM\Api\ApiWorks;
use APM\Site\SiteChunkPage;
use APM\Site\SiteCollationTable;
use APM\Site\SiteDocuments;
use APM\Site\SiteMultiChunkEdition;
use APM\Site\SitePageViewer;
use APM\Site\SitePeople;
use APM\Site\SiteReact;
use APM\Site\SiteSettings;
use APM\System\ApmContainerKey;
use APM\System\ApmSystemManager;
use APM\System\Auth\Authenticator;
use APM\System\Config\ApmSystemConfig;
use APM\System\Factories\LoggerFactory;
use APM\System\Factories\SystemConfigFactory;
use APM\System\Factories\TwigFactory;
use APM\System\SystemManager;
use APM\SystemConfigArray;
use JetBrains\PhpStorm\NoReturn;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Log\LoggerInterface;
use Slim\App;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Routing\RouteCollectorProxy;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;
use ThomasInstitut\Profiler\SystemProfiler;
use function DI\autowire;
use function DI\factory;

require_once __DIR__ . '/../vendor/autoload.php';

error_reporting(E_ERROR | E_PARSE | E_NOTICE);

SystemProfiler::start();

$config = SystemConfigArray::get();
if (!is_array($config)) {
    exitWithErrorMessage($config);
}

$builder = new DI\ContainerBuilder();

$builder->addDefinitions([
    ApmContainerKey::CONFIG_ARRAY => $config,
    ApmContainerKey::SITE_USER_ID => -1, // set by authenticator
    ApmContainerKey::API_USER_ID => -1, // set by authenticator
    ApmSystemConfig::class => factory([SystemConfigFactory::class, 'create']),
    LoggerInterface::class => factory([LoggerFactory::class, 'create']),
    Twig::class => factory([TwigFactory::class, 'create']),
    SystemManager::class => autowire(ApmSystemManager::class),
]);

try {
    $container = $builder->build();
} catch (Exception $e) {
    exitWithErrorMessage("Can't build container: " . $e->getMessage());
}

//$container->set(ApmContainerKey::SITE_USER_ID, -1); // set by authenticator
//$container->set(ApmContainerKey::API_USER_ID, -1); // set by authenticator

// Setup Slim App
$app = new App(new ResponseFactory(), $container);

$systemConfig = $container->get(ApmSystemConfig::class);

// Set timezone
date_default_timezone_set($systemConfig->general->defaultTimeZone);

// setup app's basePath if necessary
$subDir = $systemConfig->general->subDir;

if ($subDir !== '') {
    $app->setBasePath("/$subDir");
}

$app->addErrorMiddleware(true, true, true);
$router = $app->getRouteCollector()->getRouteParser();

$container->set(RouteParserInterface::class, $router);
//$systemManager = $container->get(SystemManager::class);
//$systemManager->setRouter($router);

$app->add(new TwigMiddleware($container->get(Twig::class), $router, $app->getBasePath()));


// Create routes
createApiAuthenticatedRoutes($app, $container);
createApiUnauthenticatedRoutes($app, $container);
createSiteUnauthenticatedRoutes($app, $container);
createSiteRoutes($app, $container); // must be the last

SystemProfiler::lap('Ready');
return $app;

/**
 * Exits with an error message
 * @param string $msg
 */
#[NoReturn]
function exitWithErrorMessage(string $msg): void
{
    http_response_code(500);
    print "<pre>SERVER ERROR: $msg</pre>";
    exit();
}

function createSiteRoutes(App $app, ContainerInterface $container): void
{
    $app->group('', function (RouteCollectorProxy $group) use ($container) {

        $group->get('/person/{id}',
            function (Request $request, Response $response) use ($container) {
                return (new SitePeople($container))->personPage($request, $response);
            })
            ->setName('person');

        $group->get('/work/{work}/chunk/{chunk}',
            function (Request $request, Response $response) use ($container) {
                return (new SiteChunkPage($container))->singleChunkPage($request, $response);
            })
            ->setName('chunk');

        // COLLATION TABLES
        // Collation table with preset
        $group->get('/collation-table/auto/{work}/{chunk}/preset/{preset}',
            function (Request $request, Response $response) use ($container) {
                return (new SiteCollationTable($container))->automaticCollationPagePreset($request, $response);
            })
            ->setName('chunk.collation-table.preset');

        // Collation table with parameters in Url
        $group->get('/collation-table/auto/{work}/{chunk}/{lang}[/{ignore_punct}[/{witnesses:.*}]]',
            function (Request $request, Response $response, $args) use ($container) {
                return (new SiteCollationTable($container))->automaticCollationPageGet($request, $response, $args);
            })
            ->setName('chunk.collation-table');

        // Collation table with full options in post
        $group->post('/collation-table/auto/{work}/{chunk}/{lang}/custom',
            function (Request $request, Response $response) use ($container) {
                return (new SiteCollationTable($container))->automaticCollationPageCustom($request, $response);
            })
            ->setName('chunk.collation-table.custom');

        // edit collation table
        $group->get('/collation-table/{tableId}[/{version}]',
            function (Request $request, Response $response) use ($container) {
                return (new SiteCollationTable($container))->editCollationTable($request, $response);
            })
            ->setName('collation-table.edit');

        // CHUNK EDITION
        $group->get('/chunk-edition/new/{workId}/{chunkNumber}/{lang}',
            function (Request $request, Response $response) use ($container) {
                return (new SiteCollationTable($container))->newChunkEdition($request, $response);
            })->setName('chunk-edition.new');

        $group->get('/chunk-edition/{tableId}[/{version}]',
            function (Request $request, Response $response) use ($container) {
                return (new SiteCollationTable($container))->editCollationTable($request, $response);
            })->setName('chunk-edition.edit');


        // MULTI-CHUNK EDITION
        $group->get('/multi-chunk-edition/new',
            function (Request $request, Response $response) use ($container) {
                return (new SiteMultiChunkEdition($container))->getMultiChunkEdition($request, $response, true);
            }
        )->setName('mce.new');

        $group->get('/multi-chunk-edition/{editionId}',
            function (Request $request, Response $response) use ($container) {
                return (new SiteMultiChunkEdition($container))->getMultiChunkEdition($request, $response, false);
            }
        )->setName('mce.edit');

        // transcription editor
        $group->get('/doc/{doc}/page/{n}/view[/c/{col}]',
            function (Request $request, Response $response) use ($container) {
                return (new SitePageViewer($container))->pageViewerPageByDoc($request, $response, false);
            })
            ->setName('doc.page.transcribe');

        // transcription editor (real pages)

        $group->get('/doc/{doc}/realPage/{n}/view[/c/{col}]',
            function (Request $request, Response $response) use ($container) {
                return (new SitePageViewer($container))->pageViewerPageByDoc($request, $response, true);
            })
            ->setName('doc.page.transcribe.realPage');

        // sending to React explicitly or else the path would be picked up by the show document page below
        $group->get('/doc/{id}/definepages',
            function (Request $request, Response $response) use ($container) {
                return (new SiteReact($container))->ReactMain($request, $response);
            });

        // show document
        $group->get('/doc/{id}[/{params:.*}]',
            function (Request $request, Response $response, array $args) use ($container) {
                return (new SiteDocuments($container))->documentPage($request, $response, $args);
            })
            ->setName('doc.show');

        // for everything else, go to React
        $group->get('{path:.*}',
            function (Request $request, Response $response) use ($container) {
                return (new SiteReact($container))->ReactMain($request, $response);
            });


    })->add(function (Request $request, RequestHandlerInterface $handler) use ($container) {
        return (new Authenticator($container))->authenticateSiteRequest($request, $handler);
    });
}

function createApiUnauthenticatedRoutes(App $app, ContainerInterface $container): void
{
    $app->group('/api', function (RouteCollectorProxy $group) use ($container) {

        /**
         * Login
         *
         * API Inventory:
         *    Method: POST
         *    Authentication: none
         *    Uses action: no
         *    PHP Unit Test: no
         *    PHP Input Schema: yes
         *    PHP Output Schema: yes
         *    ApiClient Method: yes
         */
        $group->post('/login', function (Request $request, Response $response) use ($container) {
            return (new Authenticator($container))->apiLogin($request, $response);
        });
    });
}

function createApiAuthenticatedRoutes(App $app, ContainerInterface $container): void
{
    $app->group('/api', function (RouteCollectorProxy $group) use ($container) {

        // system
        createApiSystemRoutes($group, $container);
        // entity
        createApiEntityRoutes($group, $container);
        // search
        createApiSearchRoutes($group, $container);
        // images
        createApiImageRoutes($group, $container);
        // transcriptions
        createApiTranscriptionRoutes($group, $container);
        // work, works
        createApiWorksRoutes($group, $container);
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
        createApiTypesettingRoutes($group);
        // admin
        createApiAdminRoutes($group, $container);

    })->add(function (Request $request, RequestHandlerInterface $handler) use ($container) {
        return (new Authenticator($container))->authenticateApiRequest($request, $handler);
    });
}

function createApiEditionRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{
    // EDITION SOURCES

    /**
     * Returns all defined edition sources.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/edition/sources/all',
        function (Request $request, Response $response) use ($container) {
            return (new ApiEditionSources($container))->getAllSources($request, $response);
        });

    /**
     * Returns a single edition source
     *
     * TODO: change parameter tid to id
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/edition/source/get/{tid}',
        function (Request $request, Response $response) use ($container) {
            return (new ApiEditionSources($container))->getSourceByTid($request, $response);
        });

    // MULTI CHUNK EDITION

    /**
     * Return a multi-chunk edition by id and, optionally, timestamp
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/edition/multi/get/{editionId}[/{timestamp}]',
        function (Request $request, Response $response, array $args) use ($container) {
            return (new ApiMultiChunkEdition($container))->getEdition($request, $response, $args);
        });

    /**
     * Saves a multi chunk edition
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/edition/multi/save',
        function (Request $request, Response $response) use ($container) {
            return (new ApiMultiChunkEdition($container))->saveEdition($request, $response);
        });


}

function createApiCollationTableRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{
    /**
     * Generates a collation table
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/collationTable/auto',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->auto($request, $response);
        });

    /**
     * Saves a collation table
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/collationTable/save',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->save($request, $response);
        });

    /**
     * Returns a list of active editions
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/collationTable/active/editions',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->activeEditions($response);
        });

    /**
     * Returns a list of active collation tables for a work
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/collationTable/active/forWork/{workId}',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->activeForWork($request, $response);
        });

    /**
     * Converts a collation table to an edition
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/collationTable/{tableId}/convertToEdition',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->convertToEdition($request, $response);
        });

    /**
     * Returns a collation table by id
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/collationTable/{tableId}/get[/{timestamp}]',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->get($request, $response);
        }
    );

    /**
     * Returns version info for a collation table
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/collationTable/{tableId}/versionInfo/{timestamp}',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->versionInfo($request, $response);
        }
    );
}

function createApiWitnessRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{
    // WITNESSES


    /**
     * Returns witness by id with optional output type and cache flag
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/witness/get/{witnessId}[/{outputType}[/{cache}]]',
        function (Request $request, Response $response) use ($container) {
            return (new ApiWitness($container))->getWitness($request, $response);
        }
    );

    /**
     * Checks for updates of a number of witnesses
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/witness/check/updates',
        function (Request $request, Response $response) use ($container) {
            return (new ApiWitness($container))->checkWitnessUpdates($request, $response);
        }
    );

    /**
     * Creates an edition from a single witness
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/witness/{witnessId}/to/edition',
        function (Request $request, Response $response) use ($container) {
            return (new ApiCollationTable($container))->convertWitnessToEdition($request, $response);
        }
    );

}

function createApiSystemRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{
    /**
     * Returns a list of all system languages and their names
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/system/languages',
        function (Request $request, Response $response) use ($container) {
            return (new ApiSystem($container))->getSystemLanguages($request, $response);
        }
    );


    /**
     * Returns information about the authenticated API user.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/whoami',
        function (Request $request, Response $response) use ($container) {
            return (new ApiSystem($container))->whoAmI($request, $response);
        }
    );
}

function createApiAdminRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Logs a message from the frontend to the backend's log
     *
     * TODO: determine if this is still needed, or if it can be removed.
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/admin/log',
        function (Request $request, Response $response) use ($container) {
            return (new ApiLog($container))->frontEndLog($request, $response);
        }
    );
}

function createApiPersonRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{
    /**
     * Returns essential data for all people in the system. Used to populate the people page on the frontend.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/person/all/dataForPeoplePage',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPeople($container))->getAllPeopleDataForPeoplePage($request, $response);
        }
    );

    /**
     * Returns essential data for a person by id.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/person/{tid}/data/essential',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPeople($container))->getPersonEssentialData($request, $response);
        }
    );

    /**
     * Returns a list of works by a person by id.
     *
     * TODO: change parameter tid to id
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/person/{tid}/works',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPeople($container))->getWorksByPerson($request, $response);
        }
    );

    /**
     * Creates a new person entity in the system
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/person/create',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPeople($container))->personCreate($request, $response);
        }
    );
}

function createApiUsersRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Updates a user profile
     *
     * TODO: change parameter userTid to userId
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/user/{userTid}/update',
        function (Request $request, Response $response) use ($container) {
            return (new ApiUsers($container))->userUpdateProfile($request, $response);
        }
    );

    /**
     * Makes a user in the system
     *
     * TODO: change parameter personTid to personId
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/user/create/{personTid}',
        function (Request $request, Response $response) use ($container) {
            return (new ApiUsers($container))->userCreate($request, $response);
        }
    );

    /**
     * Returns the list of collation tables by a user
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/user/{userId}/collationTables',
        function (Request $request, Response $response) use ($container) {
            return (new ApiUsers($container))->userCollationTables($request, $response);
        }
    );

    /**
     * Returns the list of multi-chunk editions by a user
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/user/{userId}/multiChunkEditions',
        function (Request $request, Response $response) use ($container) {
            return (new ApiUsers($container))->userMultiChunkEditions($request, $response);
        }
    );
}

function createApiDocAndPageRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Returns information about all documents in the system. Used to populate the documents page on the frontend.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/docs/all',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->allDocumentsData($request, $response);
        }
    );


    /**
     * Returns the entityId of a document from its legacy DB id.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/doc/getId/{docId}',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->getDocId($request, $response);
        }
    );

    /**
     * Returns information about a document with optional page information of different kinds
     *
     * TODO: Try to get rid of the optional pageInfoToInclude parameter by using a different endpoint for page information.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/doc/{docId}/info[/{pageInfoToInclude}]',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->getDocumentInfo($request, $response);
        }
    );


    /**
     * Creates a new document entity in the system
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/doc/create',
        function (Request $request, Response $response, array $args) use ($container) {
            return (new ApiDocuments($container))->createDocument($request, $response, $args);
        }
    );

    /**
     * Adds pages to a document
     *
     * TODO: support adding pages in the middle of the document, not just at the end.
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/doc/{id}/addpages',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->addPages($request, $response);
        }
    );

    /**
     * Gets the number of columns in a page
     *
     * TODO: Get rid of this endpoint, the number of columns can be found from the page/{pageId}/info endpoint.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/{document}/{page}/numcolumns',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->getNumColumns($request, $response);
        }
    );


    /**
     * Returns the page types defined in the system and their names.
     *
     * TODO: move to 'api/system/pageTypes'
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/page/types',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->getPageTypes($request, $response);
        }
    );

    /**
     * Update the information of a single page
     *
     * TODO: remove this endpoint since the bulk update endpoint can do exactly the same thing.
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/page/{pageId}/update',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->updatePageSettings($request, $response);
        }
    );

    /**
     * Updates the information of multiple pages
     *
     * TODO: candidate for a refactor so as to make it the only page update endpoint in the system. May require work in the backend though.
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: yes
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/page/bulkupdate',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->updatePageSettingsBulk($request, $response);
        }
    );

    /**
     * Adds a new column to a page
     *
     * TODO: change this endpoint to take a pageId instead of a documentId and a pageNumber.
     * TODO: determine if this endpoint is still needed, adding a column can easily be done with a page update
     *
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/{document}/{page}/newcolumn',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->addNewColumn($request, $response);
        }
    );

    /**
     * Get info about a page
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/page/{pageId}/info',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->getPageInfo($request, $response);
        }
    );

    /**
     * Gets information about a several pages at the same time
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/pages/info',
        function (Request $request, Response $response) use ($container) {
            return (new ApiDocuments($container))->getPageInfoBulk($request, $response);
        }
    );
}

function createApiEntityRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Returns the entity data for all entities that can be used as qualifications in a statement
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/statementQualificationObjects/data",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->getValidQualificationObjects($request, $response, false);
        }
    );

    /**
     * Returns the entity ids for all entities that can be used as qualifications in a statement
     *
     * TODO: merge with the above endpoint since the difference is only whether data or ids is returned.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/statementQualificationObjects",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->getValidQualificationObjects($request, $response, true);
        }
    );

    /**
     * Returns all entities of a given type.
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/{entityType}/entities",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->getEntitiesForType($request, $response);
        }
    );

    /**
     * Returns predicate definition for a given entity type
     *
     * TODO: change parameter id to typeOrEntityId
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/{id}/predicateDefinitionsForType",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->getPredicateDefinitionsForType($request, $response);
        }
    );

    /**
     * Returns the definition of a predicate
     *
     * TODO: change parameter id to predicateId
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/{id}/predicateDefinition",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->getPredicateDefinition($request, $response);
        }
    );

    /**
     * Returns the entity data for an entity
     *
     * TODO: change parameter tid to entityId
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/{tid}/data",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->getEntityData($request, $response);
        }
    );

    /**
     * Executes a list of statement edition commands
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post("/entity/statements/edit",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->statementEdition($request, $response);
        }
    );

    /**
     * Returns matching entities for a given entity type and a search string
     *
     * TODO: move this to 'api/search', rename to something like 'api/search/entitiesByTypeName'
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/entity/nameSearch/{inputString}/{typeList}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiEntity($container))->nameSearch($request, $response);
        }
    );
}

function createApiPresetsRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Returns a preset
     *
     * TODO: can't this be a simple GET request? (Issue #321)
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/presets/get',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPresets($container))->getPresets($request, $response);
        }
    );

    /**
     * Deletes a preset
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get('/presets/delete/{id}',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPresets($container))->deletePreset($request, $response);
        }
    );

    /**
     * Returns a sigla preset
     *
     * TODO: can't this be a simple GET request? (Issue #321)
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/presets/sigla/get',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPresets($container))->getSiglaPresets($request, $response);
        }
    );

    /**
     * Saves a sigla preset
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/presets/sigla/save',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPresets($container))->saveSiglaPreset($request, $response);
        }
    );

    /**
     * Returns an automatic collation preset
     *
     * TODO: can't this be a simple GET request? (Issue #321)
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/presets/act/get',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPresets($container))->getAutomaticCollationPresets($request, $response);
        }
    );

    /**
     * Saves a preset
     *
     * TODO: this should be renamed to 'api/preset/save' and perhaps merge all other saves into it (Issue #321)
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/presets/post',
        function (Request $request, Response $response) use ($container) {
            return (new ApiPresets($container))->savePreset($request, $response);
        }
    );
}

/**
 * Create API image routes
 *
 * TODO: Find a way to generate images in the frontend and get rid of this (Issue #322)
 *
 * @param RouteCollectorProxy $group
 * @param ContainerInterface $container
 * @return void
 */
function createApiImageRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Returns a mark image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/mark/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateMarkIcon($request, $response);
        }
    );

    /**
     * Returns a no word break image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/nowb/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateNoWordBreakIcon($request, $response);
        }
    );

    /**
     * Returns an 'illegible' image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/illegible/{size}/{length}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateIllegibleIcon($request, $response);
        }
    );

    /**
     * Returns a chunk mark image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/chunkmark/{dareid}/{chunkno}/{lwid}/{segment}/{type}/{dir}/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateChunkMarkIcon($request, $response);
        }
    );

    /**
     * Returns a chapter mark image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/chaptermark/{work}/{level}/{number}/{type}/{dir}/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateChapterMarkIcon($request, $response);
        }
    );

    /**
     * Returns a line gap image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/linegap/{count}/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateLineGapImage($request, $response);
        }
    );

    /**
     * Returns a character gap image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/charactergap/{length}/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateCharacterGapImage($request, $response);
        }
    );

    /**
     * Returns a paragraph mark image
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/images/paragraphmark/{size}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiIcons($container))->generateParagraphMarkIcon($request, $response);
        }
    );
}

function createApiSearchRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{
    /**
     * Searches for a keyword
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post("/search/keyword",
        function (Request $request, Response $response) use ($container) {
            return (new ApiSearch($container))->search($request, $response);
        }
    );

    /**
     * Searches in transcriptions
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->any("/search/transcriptions",
        function (Request $request, Response $response) use ($container) {
            return (new ApiSearch($container))->getTranscriptionTitles($request, $response);
        }
    );

    /**
     * Returns a list of transcribers
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->any("/search/transcribers",
        function (Request $request, Response $response) use ($container) {
            return (new ApiSearch($container))->getTranscribers($request, $response);
        }
    );

    /**
     * Returns a list of edition titles
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->any("/search/editions",
        function (Request $request, Response $response) use ($container) {
            return (new ApiSearch($container))->getEditionTitles($request, $response);
        }
    );

    /**
     * Returns a list of editors
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->any("/search/editors",
        function (Request $request, Response $response) use ($container) {
            return (new ApiSearch($container))->getEditors($request, $response);
        }
    );

}

function createApiTranscriptionRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Returns transcribed pages by user
     *
     * TODO: change parameter userTid to userId, docPageData to something more meaningful
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/transcriptions/byUser/{userTid}/docPageData",
        function (Request $request, Response $response) use ($container) {
            return (new ApiUsers($container))->getTranscribedPages($request, $response);
        }
    );

    /**
     * Returns the transcription for a given document, page and column
     *
     * TODO: shouldn't this be by pageId and column?
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/transcriptions/{document}/{page}/{column}/get",
        function (Request $request, Response $response) use ($container) {
            return (new ApiElements($container))->getElementsByDocPageCol($request, $response);
        }
    );


    /**
     * Returns a transcription by pageId and column and version
     *
     * TODO: merge with previous route
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/transcriptions/{document}/{page}/{column}/get/version/{version}",
        function (Request $request, Response $response) use ($container) {
            return (new ApiElements($container))->getElementsByDocPageCol($request, $response);
        }
    );

    /**
     * Updates/saves a transcription
     *
     * TODO: change handler name to saveTranscription or something like that, updateElements is not good
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post("/transcriptions/{document}/{page}/{column}/update",
        function (Request $request, Response $response) use ($container) {
            return (new ApiElements($container))->updateElementsByDocPageCol($request, $response);
        }
    );
}

function createApiWorksRoutes(RouteCollectorProxy $group, ContainerInterface $container): void
{

    /**
     * Returns all works with transcriptions in the system
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/works/all",
        function (Request $request, Response $response) use ($container) {
            return (new ApiWorks($container))->allWorksData($request, $response);
        }
    );

    /**
     * Returns legacy work information
     *
     * TODO: get rid of this (Issue #323)
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/work/{workId}/old-info",
        function (Request $request, Response $response) use ($container) {
            return (new ApiWorks($container))->getWorkInfoOld($request, $response);
        }
    );

    /**
     * Get work data
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/work/{workId}/data",
        function (Request $request, Response $response) use ($container) {
            return (new ApiWorks($container))->getWorkData($request, $response);
        }
    );

    /**
     * Returns witnesses by work and chunk number
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/work/{workId}/chunk/{chunkNumber}/witnesses", function (Request $request, Response $response) use ($container) {
        return (new ApiWitness($container))->getWitnessesForChunk($request, $response);
    }
    );

    /**
     * Returns collation tables (and editions) by work and chunk number
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/work/{workId}/chunk/{chunkNumber}/ctables", function (Request $request, Response $response) use ($container) {
        return (new ApiWitness($container))->getCollationTablesForChunk($request, $response);
    }
    );

    /**
     * Returns chunks with transcription by work
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/work/{workId}/chunksWithTranscription",
        function (Request $request, Response $response) use ($container) {
            return (new ApiWorks($container))->getChunksWithTranscription($request, $response);
        }
    );

    /**
     * Returns authors for a work
     *
     * TODO: is this necessary? What is an author here?
     *
     * API Inventory:
     *    Method: GET
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->get("/works/authors", function (Request $request, Response $response) use ($container) {
        return (new ApiWorks($container))->getAuthorList($request, $response);
    }
    );
}

function createApiTypesettingRoutes(RouteCollectorProxy $group): void
{

    /**
     * Typesets a document into a PDF
     *
     * API Inventory:
     *    Method: POST
     *    Authentication: user token
     *    Uses action: no
     *    PHP Unit Test: no
     *    PHP Input Schema: TBD
     *    PHP Output Schema: TBD
     *    ApiClient Method: TBD
     */
    $group->post('/typeset/toPdf', [ApiTypesetPdf::class, 'toPdf']);
}

function createSiteUnauthenticatedRoutes(App $app, ContainerInterface $container): void
{
    $app->any('/login',
        // handled by React
        function (Request $request, Response $response) use ($container) {
            return (new SiteReact($container))->ReactMain($request, $response);
        })
        ->setName('login');

    $app->get('/app-settings', function (Request $request, Response $response) use ($container) {
        return (new SiteSettings($container))->getSiteSettings($request, $response);
    });
}
