<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

require '../vendor/autoload.php';
require 'apdata.php';
require 'config.php';

// slim parameters
$config['addContentLengthHeader'] = false;


// Application parameters
$config['app_name'] = 'Averroes Project';
$config['version'] = '0.06';
$config['app_shortname'] = 'Averroes';
$config['copyright_notice'] = '2016, <a href="http://www.thomasinstitut.uni-koeln.de/">Thomas-Institut</a>, <a href="http://www.uni-koeln.de/">Universität zu Köln</a>';

$config['default_timezone'] = "Europe/Berlin";

$config['tables'] = array();
$config['tables']['settings']   = 'ap_settings';
$config['tables']['ednotes']    = 'ap_ednotes';
$config['tables']['elements']   = 'ap_elements';
$config['tables']['items']      = 'ap_items';
$config['tables']['hands']      = 'ap_hands';
$config['tables']['users']      = 'ap_users';
$config['tables']['docs']       = 'ap_docs';


// Initialize the app
$app = new \Slim\App(["settings" => $config]);
date_default_timezone_set($config['default_timezone']);

// Setup the app's container
$container = $app->getContainer();

// Database
$container['db'] = function($c){
   $db = new ApData($c['settings']['db'], $c['settings']['tables']);
   return $db ;
};

// Twig
$container['view'] = function ($container) {
    $view = new \Slim\Views\Twig('templates', [
        'cache' => false   // Change this eventually!
    ]);
    // Instantiate and add Slim specific extension
    $basePath = rtrim(str_ireplace('index.php', '', $container['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new Slim\Views\TwigExtension($container['router'], $basePath));
    return $view;
};

// ---------------------------------------------------------
// 
// MIDDLEWARE
// 
// ---------------------------------------------------------

// Authentication middleware
$app->add(function ($request, $response, $next){
    session_start(['cookie_lifetime' => 86400,]);
    if ($request->getUri()->getPath() !== '/login'){
        if (!isset($_SESSION['userid'])){
            return $response->withHeader('Location', '/login');
        }
        else {
            $this->userInfo = $this->db->getUserInfoByUserId($_SESSION['userid']);
            return $next($request, $response); 
        }
    }
    else {
        return $next($request, $response); 
    }
 });
 
 // Timestamp middleware
 // creates the footer with  copyright notice with the current time
 $app->add(function ($request, $response, $next){
    $config = $this->settings;
    $this->copyrightNotice  = $config['app_name'] . " " . $config['version'] . " &bull; &copy; " . $config['copyright_notice'] . " &bull; " .  strftime("%d %b %Y, %H:%M:%S %Z");
    return $next($request, $response); 
 });

 
// ---------------------------------------------------------
// 
// ROUTES
// 
// ---------------------------------------------------------
 


// LOGIN
$app->any('/login', function (Request $request, Response $response) {
    if ($request->isPost()){
        $data = $request->getParsedBody();
        if (isset($data['user']) && isset($data['pwd'])){
            $user = filter_var($data['user'], FILTER_SANITIZE_STRING);
            $pwd = filter_var($data['pwd'], FILTER_SANITIZE_STRING);
            if ($this->db->usernameExists($user) and password_verify($pwd, $this->db->userPassword($user))){
                // Success!
                $_SESSION['userid'] = $this->db->getUserIdByUsername($user);
                return $response->withHeader('Location', $this->router->pathFor('home'));
            }
        }
    }
    $msg = '';
    return $this->view->render($response, 'login.twig', [ 'message' => $msg ]);
})->setName('login');

// LOGOUT
$app->any('/logout', function (Request $request, Response $response) {
    session_unset();
    session_destroy();
    return $response->withHeader('Location', $this->router->pathFor('home'));
})->setName('logout');

// HOME
$app->get('/',function (Request $request, Response $response) {
    return $response->withHeader('Location', $this->router->pathFor('docs'));
//    return $this->view->render($response, 'home.twig', [
//        'userinfo' => $this->userInfo, 
//        'copyright' => $this->copyrightNotice
//    ]);
})->setName('home');

// USER.PROFILE
$app->get('/user/{username}',function (Request $request, Response $response) {
    //global $config;
    $username = $request->getAttribute('username');
    if (!$this->db->usernameExists($username)){
        return $this->view->render($response, 'user.notfound.twig', [
        'userinfo' => $this->userInfo, 
        'copyright' => $this->copyrightNotice,
        'theuser' => $username
    ]);
    }
    $userInfo = $this->db->getUserInfoByUsername($username);
    
    return $this->view->render($response, 'user.profile.twig', [
        'userinfo' => $this->userInfo, 
        'copyright' => $this->copyrightNotice,
        'theuser' => $userInfo
    ]);
})->setName('user.profile');


// DOCS
$app->get('/documents',function (Request $request, Response $response) {
    $db = $this->db;
    $docIds = $db->getDocIdList();
    $docs = array();
    foreach ($docIds as $docId){
        $doc = array();
        $doc['numPages'] = $db->getPageCountByDocId($docId);
        $doc['numLines'] = $db->getLineCountByDoc($docId);
        $transcribedPages = $db->getPageListByDocId($docId);
        $doc['numTranscribedPages'] = count($transcribedPages);
        $editorsUsernames = $db->getEditorsByDocId($docId);
        $doc['editors'] = array();
        foreach ($editorsUsernames as $edUsername){
            array_push($doc['editors'], $db->getUserInfoByUsername($edUsername));
        }
        $doc['docInfo'] = $db->getDoc($docId);
        $doc['tableId'] = "doc-$docId-table";
        $doc['pages'] = buildPageArray($doc['numPages'], $transcribedPages);
        array_push($docs, $doc);
    }
    return $this->view->render($response, 'docs.twig', [
        'userinfo' => $this->userInfo, 
        'copyright' => $this->copyrightNotice,
        'docs' => $docs
    ]);
})->setName('docs');

//
// PAGEVIEWER
//
$app->get('/pageviewer/{doc}/{page}', function(Request $request, Response $response){
    $docId = $request->getAttribute('doc');
    $pageNumber = $request->getAttribute('page');
    
    $docInfo = $this->db->getDoc($docId);
    $docPageCount = $this->db->getPageCountByDocId($docId);
    $transcribedPages = $this->db->getPageListByDocId($docId);
    $thePages = buildPageArray($docPageCount, $transcribedPages);
    $imageUrl = $this->db->getImageUrlByDocId($docId, $pageNumber);
    
    return $this->view->render($response, 'pageviewer.twig', [
        'userinfo' => $this->userInfo, 
        'copyright' => $this->copyrightNotice,
        'doc' => $docId,
        'docInfo' => $docInfo,
        'docPageCount' => $docPageCount,
        'page' => $pageNumber,
        'thePages' => $thePages,
        'imageUrl' => $imageUrl
    ]);
})->setName('pageviewer');


//
// API -> getElements
//
$app->get('/api/elements/{document}/{page}/{column}', function(Request $request, Response $response){
   
    $docId = $request->getAttribute('document');
    $pageNumber = $request->getAttribute('page');
    $columnNumber = $request->getAttribute('column');
    
    // Get the elements
    $elements = $this->db->getColumnElements($docId, $pageNumber, $columnNumber);
    
    if ($elements === NULL){
        $elements = [];
    }

    // Get the editorial notes
    $ednotes = $this->db->getEditorialNotesByDocPageCol($docId, $pageNumber, $columnNumber);
    
    if ($ednotes === NULL){
        $ednotes = [];
    }
    
    // Get the information about every person in the elements and editorial notes
    $people = [];
    foreach($elements as $e){
        if (!isset($people[$e->editorId])){
            $people[$e->editorId] = $this->db->getUserInfoByUserId($e->editorId);
        }
    }
    foreach($ednotes as $e){
        if (!isset($people[$e->authorId])){
            $people[$e->authorId] = $this->db->getUserInfoByUserId($e->authorId);
        }
    }
    
    return $response->withJson(['elements' => $elements, 'ednotes' => $ednotes, 'people' => $people]);
    
})->setName('api_getelements');



//
//  run!
// 
$app->run();


// Utility function
function buildPageArray($numPages, $transcribedPages){
    $thePages = array();
    for ($pageNumber = 1; $pageNumber <= $numPages; $pageNumber++){
        $thePage = array();
        $thePage['number'] = $pageNumber;
        $thePage['classes'] = '';
        if (array_search($pageNumber, $transcribedPages) === FALSE){
            $thePage['classes'] = $thePage['classes'] . ' withouttranscription';
        }
        array_push($thePages, $thePage);
    }
    return $thePages;
}