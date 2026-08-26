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
use APM\Api\ApiPublication;
use APM\Api\ApiSearch;
use APM\Api\ApiSystem;
use APM\Api\ApiTypesetPdf;
use APM\Api\ApiUsers;
use APM\Api\ApiWitness;
use APM\Api\ApiWorks;
use APM\Site\SiteChunkPage;
use APM\Site\SiteCollationTable;
use APM\Site\SiteDocuments;
use APM\Site\SitePageViewer;
use APM\Site\SitePeople;
use APM\Site\SiteReact;
use APM\Site\SiteSettings;
use APM\System\Auth\Authenticator;
use APM\System\Config\ApmSystemConfig;
use APM\System\ContainerDefinitions\WebAppDefsProvider;
use APM\SystemConfigArray;
use DI\DependencyException;
use DI\NotFoundException;
use JetBrains\PhpStorm\NoReturn;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\App;
use Slim\Interfaces\RouteParserInterface;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Routing\RouteCollectorProxy;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;
use ThomasInstitut\Profiler\SystemProfiler;


require_once __DIR__ . '/../vendor/autoload.php';

error_reporting(E_ERROR | E_PARSE | E_NOTICE);

SystemProfiler::start();

$config = SystemConfigArray::get();
if (!is_array($config)) {
    exitWithErrorMessage($config);
}

$builder = new DI\ContainerBuilder();

$builder->addDefinitions((new WebAppDefsProvider())->getContainerDefs($config));

try {
    $container = $builder->build();
} catch (Exception $e) {
    exitWithErrorMessage("Can't build container: " . $e->getMessage());
}

// Setup Slim App
$app = new App(new ResponseFactory(), $container);

try {
    $systemConfig = $container->get(ApmSystemConfig::class);
} catch (Exception $e) {
    exitWithErrorMessage("Configuration error: " . $e->getMessage());
}

// Set timezone
date_default_timezone_set($systemConfig->general->defaultTimezone);

// set up app's basePath if necessary
$subDir = $systemConfig->general->subDir;

if ($subDir !== '') {
    $app->setBasePath("/$subDir");
}

$app->addErrorMiddleware(true, true, true);
$router = $app->getRouteCollector()->getRouteParser();

$container->set(RouteParserInterface::class, $router);

try {
    $app->add(new TwigMiddleware($container->get(Twig::class), $router, $app->getBasePath()));
} catch (DependencyException|NotFoundException $e) {
    exitWithErrorMessage("System setup error: " . $e->getMessage());
}


// Create routes
createApiAuthenticatedRoutes($app, $container);
createApiUnauthenticatedRoutes($app, $container);
createSiteUnauthenticatedRoutes($app);
createSiteRoutes($app, $container); // must be the last

SystemProfiler::lap('Ready');
return $app;

/**
 * Exits with an error message
 * @param string $msg
 */
#[NoReturn]  // @phpstan-ignore attribute.notFound
function exitWithErrorMessage(string $msg): void
{
    http_response_code(500);
    print "<pre>SERVER ERROR: $msg</pre>";
    exit();
}

function createSiteRoutes(App $app, ContainerInterface $container): void
{
    $app->group('', function (RouteCollectorProxy $group) use ($container) {

        $group->get('/person/{id}', [SitePeople::class, 'personPage']);
        $group->get('/work/{work}/chunk/{chunk}', [SiteChunkPage::class, 'singleChunkPage']);

        // COLLATION TABLES
        // Collation table with preset
        $group->get('/collation-table/auto/{work}/{chunk}/preset/{preset}',
            [SiteCollationTable::class, 'automaticCollationPagePreset']);

        // Collation table with parameters in Url
        $group->get('/collation-table/auto/{work}/{chunk}/{lang}[/{ignore_punct}[/{witnesses:.*}]]',
            [SiteCollationTable::class, 'automaticCollationPageGet']);

        // Collation table with full options in post
        $group->post('/collation-table/auto/{work}/{chunk}/{lang}/custom',
            [SiteCollationTable::class, 'automaticCollationPageCustom']);

        // edit collation table
        $group->get('/collation-table/{tableId}[/{version}]',
            [SiteCollationTable::class, 'editCollationTable']);

        // CHUNK EDITION
        $group->get('/chunk-edition/new/{workId}/{chunkNumber}/{lang}',
            [SiteCollationTable::class, 'newChunkEdition']);

        $group->get('/chunk-edition/{tableId}[/{version}]',
            [SiteCollationTable::class, 'editCollationTable'])->setName('chunk-edition.edit');

        // transcription editor
        $group->get('/doc/{doc}/page/{n}/view[/c/{col}]',
            fn(Request $request, Response $response) => (new SitePageViewer($container))->pageViewerPageByDoc($request, $response, false))
        ->setName('transcription.editor');

        // transcription editor (real pages)

        $group->get('/doc/{doc}/realPage/{n}/view[/c/{col}]',
            fn(Request $request, Response $response) => (new SitePageViewer($container))->pageViewerPageByDoc($request, $response, true))
        ->setName('transcription.editor.real');

        // sending to React explicitly or else the path would be picked up by the show document page below
        $group->get('/doc/{id}/definepages',
            [SiteReact::class, 'ReactMain']);

        // show document
        $group->get('/doc/{id}[/{params:.*}]',
            [SiteDocuments::class, 'documentPage'])->setName('docPage');

        // for everything else, go to React
        $group->get('{path:.*}', [ SiteReact::class, 'ReactMain']);


    })->add(fn(Request $request, RequestHandlerInterface $handler) =>
        (new Authenticator($container))->authenticateSiteRequest($request, $handler));
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
        $group->post('/login', [Authenticator::class, 'apiLogin']);

        createApiPublicationRoutes($group);
    });
}

function createApiAuthenticatedRoutes(App $app, ContainerInterface $container): void
{
    $app->group('/api', function (RouteCollectorProxy $group) use ($container) {

        // system
        createApiSystemRoutes($group);
        // entity
        createApiEntityRoutes($group, $container);
        // search
        createApiSearchRoutes($group);
        // images
        createApiImageRoutes($group);
        // transcriptions
        createApiTranscriptionRoutes($group);
        // work, works
        createApiWorksRoutes($group);
        // presets
        createApiPresetsRoutes($group);
        // doc, page, pages
        createApiDocAndPageRoutes($group);
        // person
        createApiPersonRoutes($group);
        // user
        createApiUsersRoutes($group);
        // witness
        createApiWitnessRoutes($group);
        // collation-table
        createApiCollationTableRoutes($group, $container);
        // edition
        createApiEditionRoutes($group);
        // typeset
        createApiTypesettingRoutes($group);
        // admin
        createApiAdminRoutes($group);
    })->add(fn(Request $request, RequestHandlerInterface $handler) =>
        (new Authenticator($container))->authenticateApiRequest($request, $handler));
}

function createApiEditionRoutes(RouteCollectorProxy $group): void
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
        [ApiEditionSources::class, 'getAllSources']);

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
        [ApiEditionSources::class, 'getSourceByTid']);

    // MULTI CHUNK EDITION


    $group->get('/edition/multi/get/{editionId}/versions',
        [ApiMultiChunkEdition::class, 'getEditionVersions']);

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
        [ApiMultiChunkEdition::class, 'getEdition']);

    /**
     * Saves a multi-chunk edition
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
        [ApiMultiChunkEdition::class, 'saveEdition']);


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
        [ApiCollationTable::class, 'auto']);

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
        [ApiCollationTable::class, 'save']);

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
        fn(Request $request, Response $response) => (new ApiCollationTable($container))->activeEditions($response));

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
        [ApiCollationTable::class, 'activeForWork']);

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
        [ApiCollationTable::class, 'convertToEdition']);

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
        [ApiCollationTable::class, 'get']);

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
        [ApiCollationTable::class, 'versionInfo']);
}

function createApiWitnessRoutes(RouteCollectorProxy $group): void
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
        [ApiWitness::class, 'getWitness']);

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
        [ApiWitness::class, 'checkWitnessUpdates']);

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
        [ApiCollationTable::class, 'convertWitnessToEdition']);

}

function createApiSystemRoutes(RouteCollectorProxy $group): void
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
        [ApiSystem::class, 'getSystemLanguages']);


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
        [ApiSystem::class, 'whoAmI']);
}

function createApiAdminRoutes(RouteCollectorProxy $group): void
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
        [ApiLog::class, 'frontEndLog']);
}

function createApiPersonRoutes(RouteCollectorProxy $group): void
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
        [ApiPeople::class, 'getAllPeopleDataForPeoplePage']);

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
        [ApiPeople::class, 'getPersonEssentialData']);

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
        [ApiPeople::class, 'getWorksByPerson']);

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
        [ApiPeople::class, 'personCreate']);
}

function createApiUsersRoutes(RouteCollectorProxy $group): void
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
        [ApiUsers::class, 'userUpdateProfile']);

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
        [ApiUsers::class, 'userCreate']);

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
        [ApiUsers::class, 'userCollationTables']);

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
        [ApiUsers::class, 'userMultiChunkEditions']);
}

function createApiDocAndPageRoutes(RouteCollectorProxy $group): void
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
        [ApiDocuments::class, 'allDocumentsData']);


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
        [ApiDocuments::class, 'getDocId']);

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
        [ApiDocuments::class, 'getDocumentInfo']);


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
        [ApiDocuments::class, 'createDocument']);

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
        [ApiDocuments::class, 'addPages']);

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
        [ApiDocuments::class, 'getNumColumns']);


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
        [ApiDocuments::class, 'getPageTypes']);

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
        [ApiDocuments::class, 'updatePageSettings']);

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
        [ApiDocuments::class, 'updatePageSettingsBulk']);

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
        [ApiDocuments::class, 'addNewColumn']);

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
        [ApiDocuments::class, 'getPageInfo']);

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
        [ApiDocuments::class, 'getPageInfoBulk']);
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
        fn(Request $request, Response $response) =>
            (new ApiEntity($container))->getValidQualificationObjects($request, $response, false)
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
        fn(Request $request, Response $response) =>
            (new ApiEntity($container))->getValidQualificationObjects($request, $response, true)
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
        [ApiEntity::class, 'getEntitiesForType']);

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
        [ApiEntity::class, 'getPredicateDefinitionsForType']);

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
        [ApiEntity::class, 'getPredicateDefinition']);

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
        [ApiEntity::class, 'getEntityData']);

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
        [ApiEntity::class, 'statementEdition']);

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
        [ApiEntity::class, 'nameSearch']);
}

function createApiPresetsRoutes(RouteCollectorProxy $group): void
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
        [ApiPresets::class, 'getPresets']);

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
        [ApiPresets::class, 'deletePreset']);

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
        [ApiPresets::class, 'getSiglaPresets']);

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
        [ApiPresets::class, 'saveSiglaPreset']);

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
        [ApiPresets::class, 'getAutomaticCollationPresets']);

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
        [ApiPresets::class, 'savePreset']);
}


function createApiPublicationRoutes(RouteCollectorProxy $group): void
{
    $prefix = '/publication';
    $group->get($prefix . '/list', [ApiPublication::class, 'list']);
    $group->get($prefix . '/{id}/get', [ApiPublication::class, 'get']);
}

/**
 * Create API image routes
 *
 * TODO: Find a way to generate images in the frontend and get rid of this (Issue #322)
 *
 * @param RouteCollectorProxy $group
 * @return void
 */
function createApiImageRoutes(RouteCollectorProxy $group): void
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
        [ApiIcons::class, 'generateMarkIcon']);

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
        [ApiIcons::class, 'generateNoWordBreakIcon']);

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
        [ApiIcons::class, 'generateIllegibleIcon']);

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
        [ApiIcons::class, 'generateChunkMarkIcon']);

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
        [ApiIcons::class, 'generateChapterMarkIcon']);

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
        [ApiIcons::class, 'generateLineGapImage']);

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
        [ApiIcons::class, 'generateCharacterGapImage']);

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
        [ApiIcons::class, 'generateParagraphMarkIcon']);
}

function createApiSearchRoutes(RouteCollectorProxy $group): void
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
        [ApiSearch::class, 'search']);

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
        [ApiSearch::class, 'getTranscriptionTitles']);

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
        [ApiSearch::class, 'getTranscribers']);

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
        [ApiSearch::class, 'getEditionTitles']);

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
        [ApiSearch::class, 'getEditors']);

}

function createApiTranscriptionRoutes(RouteCollectorProxy $group): void
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
        [ApiUsers::class, 'getTranscribedPages']);

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
        [ApiElements::class, 'getElementsByDocPageCol']);


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
        [ApiElements::class, 'getElementsByDocPageCol']);

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
        [ApiElements::class, 'updateElementsByDocPageCol']);
}

function createApiWorksRoutes(RouteCollectorProxy $group): void
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
        [ApiWorks::class, 'allWorksData']);

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
        [ApiWorks::class, 'getWorkInfoOld']);

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
        [ApiWorks::class, 'getWorkData']);

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
    $group->get("/work/{workId}/chunk/{chunkNumber}/witnesses", [ApiWitness::class, 'getWitnessesForChunk']);

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
    $group->get("/work/{workId}/chunk/{chunkNumber}/ctables", [ApiWitness::class, 'getCollationTablesForChunk']);

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
        [ApiWorks::class, 'getChunksWithTranscription']);

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
    $group->get("/works/authors", [ApiWorks::class, 'getAuthorList']);
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

function createSiteUnauthenticatedRoutes(App $app): void
{
    $app->any('/login',
        // handled by React
        [SiteReact::class, 'ReactMain'])
        ->setName('login');

    $app->get('/app-settings', [SiteSettings::class, 'getSiteSettings']);
}
