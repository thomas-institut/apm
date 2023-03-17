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
 * @brief Middleware class for site authentication
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 * Short term user authentication is implemented by storing the user id
 * in the PHP session.  
 * Long term user authentication ('Remember me' option) is done by storing a
 * cookie in the user's browser with the user id information, a random token and
 * an encrypted hash of the used id and the token. The hash is generated using 
 * a randomly chosen secret key.
 */

namespace APM\System\Auth;

use APM\System\ApmContainerKey;
use APM\System\SystemManager;
use AverroesProject\Data\UserManager;
use DateInterval;
use DateTime;
use DI\DependencyException;
use DI\NotFoundException;
use Exception;
use Monolog\Logger;
use Psr\Container\ContainerInterface;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use \Dflydev\FigCookies\FigRequestCookies;
use \Dflydev\FigCookies\SetCookie;
use \Dflydev\FigCookies\FigResponseCookies;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Interfaces\RouteParserInterface;
use Slim\Routing\RouteParser;
use Slim\Views\Twig;
use ThomasInstitut\Profiler\SimpleProfiler;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;

/**
 * Middleware class for site authentication
 *
 */
class Authenticator {


    const LOGIN_PAGE_SIGNATURE = 'Login-8gRSSm23HPdStrEid5Wi';
    /**
     * @var ContainerInterface
     */
    private ContainerInterface $container;

    /**
     * @var Logger
     */
    private Logger $apiLogger;
    private Logger $siteLogger;
    private Logger $logger;

    /**
     * @var RouteParser|RouteParserInterface
     */
    protected RouteParserInterface|RouteParser $router;

   
    private string $cookieName = 'rme';
    private string $secret = '1256106427895916503';
    private bool $debugMode;
   
    //Constructor

    /**
     * @var UserManager
     */
    private UserManager $userManager;
    /**
     * @var Twig
     */
    private Twig $view;

    /**
     * @var array
     */
//    private $config;
    /**
     * @var SystemManager
     */
    private SystemManager $systemManager;
    private SimpleProfiler $profiler;

    /**
     * Authenticator constructor.
     * @param ContainerInterface $ci
     */
    public function __construct(ContainerInterface $ci)
    {
        $this->container = $ci;
        $this->systemManager = $ci->get(ApmContainerKey::SYSTEM_MANAGER);
//        $this->config = $this->systemManager->getConfig();
        $this->router = $this->systemManager->getRouter();
        $this->userManager = $this->systemManager->getDataManager()->userManager;
        $this->logger = $this->systemManager->getLogger()->withName('AUTH');
        $this->view = $this->systemManager->getTwig();
        $this->apiLogger = $this->logger->withName('AUTH-API');
        $this->siteLogger = $this->logger->withName('AUTH-SITE');
        $this->profiler = new SimpleProfiler();

        $this->debugMode = false;
    }

    /**
     * @return string
     */
    private function getBaseUrl() : string {
        return $this->systemManager->getBaseUrl();
    }

    /**
     * @return string
     * @throws Exception
     */
    private function generateRandomToken(): string
    {
        return bin2hex(random_bytes(20));
    }

    private function generateLongTermCookieValue($token, $userId): string
    {
        $v = $userId . ':' . $token;
        return $v . ':' . $this->generateMac($v);
    }
    
    private function generateMac($v): string
    {
        return hash_hmac('sha256', $v, $this->secret);
    }

    /**
     * Logs a debug message in the logger
     * @codeCoverageIgnore
     *
     * @param string $msg
     * @param array $data
     */
    private function debug(string $msg, array $data=[]): void
    {
        if ($this->debugMode){
            $this->logger->debug($msg, $data);
        }
    }

    public function authenticate(Request $request, RequestHandlerInterface $handler): Response
    {
        if ($this->debugMode) {
            $this->profiler->start();
        }


        session_start();

        $this->debug('Starting authenticator middleware');
        //$this->debug("Login headers", $request->getHeaders());
        //$this->debug('Request method is ' . $request->getMethod());

        $success = false;
        if (!isset($_SESSION['userid'])){
            // Check for long term cookie
            $this->debug('SITE : No session');
            $userId = $this->getUserIdFromLongTermCookie($request);
            if ($userId !== false) {
                $success = true;
            }
        } else {
            $userId = $_SESSION['userid'];
            $this->debug('SITE : Session is set, user id = ' . $userId);
            if ($this->userManager->userExistsById($userId)){
                $this->debug("User id exists!");
                $success = true;
            } else {
                $this->debug("User id does not exist!");
            }
            
        }
        if ($success){
            $this->debug('SITE: Success, go ahead!');
            $_SESSION['userid'] = $userId;
            $ui = $this->userManager->getUserInfoByUserId($userId);
            if ($this->userManager->isUserAllowedTo($userId, 'manageUsers')){
                $ui['manageUsers'] = 1;
            }
            if ($this->userManager->isRoot($userId)) {
                $ui['isRoot'] = true;
            }

            $this->container->set(ApmContainerKey::USER_INFO, $ui);
            if ($this->debugMode) {
                $this->profiler->stop();
                $this->debug("Profiler", $this->profiler->getLaps());
            }
            return $handler->handle($request);
        } else {
            $this->debug("SITE : Authentication fail, logging out "
                    . "and redirecting to login");
            session_unset();
            session_destroy();
            $response = new \Slim\Psr7\Response();
            $response = FigResponseCookies::expire($response, 
                    $this->cookieName);

            $loginUrl = $this->router->urlFor('login');
            $this->logger->debug('Redirecting to ' . $loginUrl);
            return $response->withHeader('Location', $loginUrl)->withStatus(302);
        }
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws LoaderError
     * @throws RuntimeError
     * @throws SyntaxError
     * @throws Exception
     */
    public function login(Request $request, Response $response)
    {
        session_start();
        $this->debug('Login request');
        $this->debug("Login headers", $request->getHeaders());
        $this->debug('Request method is ' . $request->getMethod());
        $msg = '';
        if ($request->getMethod() === 'POST') {
            $data = $request->getParsedBody();
            // DON'T DO THIS:    $this->debug('Got POST data', $data);
            // ... it will show the user password in the log!
            if (isset($data['user']) && isset($data['pwd'])){
                $this->debug('Got data for login');
                $user = filter_var($data['user'], FILTER_SANITIZE_STRING);
                $pwd = filter_var($data['pwd'], FILTER_SANITIZE_STRING);
                $rememberme = 
                        isset($data['rememberme']) ? $data['rememberme'] : '';
                $this->debug('Trying to log in user ' . $user);
                if ($this->userManager->verifyUserPassword($user, $pwd)){
                    $userAgent = $request->getHeader('User-Agent')[0];
                    $ipAddress = $request->getServerParams()['REMOTE_ADDR'];
                    $this->siteLogger->info("Login", ['user' => $user, 'user_agent' => $userAgent, 'ip_address' => $ipAddress ]);
                    // Success!
                    $userId = $this->userManager->getUserIdFromUsername($user);
                    $_SESSION['userid'] = $userId;
                    $this->debug('Generating token cookie');
                    $token = $this->generateRandomToken();
                    $this->userManager->storeUserToken(
                            $userId, 
                            $userAgent, 
                            $ipAddress,
                            $token
                    );
                    $cookieValue = $this->generateLongTermCookieValue($token, 
                            $userId);
                    if ($rememberme === 'on'){
                        $this->debug('User wants to be remembered');
                        $now = new DateTime();
                        $cookie = SetCookie::create($this->cookieName)
                                ->withValue($cookieValue)
                                ->withExpires($now->add(
                                        new DateInterval('P14D')));
                    } else {
                        $cookie = SetCookie::create($this->cookieName)
                                ->withValue($cookieValue);
                    }
                    
                    $response = FigResponseCookies::set($response, $cookie);
                    return $response->withHeader('Location', 
                            $this->router->urlFor('home'))->withStatus(302);
                }
                else {
                    $this->siteLogger->notice('Wrong user/password', 
                            ['user' => $user]);
                    $msg = "Wrong username/password, please try again";
                }
            }
        }
        $this->debug('Showing login page');

        return $this->view->render($response, 'login.twig',
                [
                    'message' => $msg,
                    'baseurl' => $this->getBaseUrl(),
                    'signature' => self::LOGIN_PAGE_SIGNATURE
                ]);
    }
    
    public function logout(Request $request, Response $response)
    {
        $this->debug('Logout request');
        session_start();
        if (!isset($_SESSION['userid'])){
            $this->siteLogger->error("Logout attempt without a valid session");
            return $response->withHeader('Location', 
                $this->router->urlFor('home'))->withStatus(302);
        }
        $userId = $_SESSION['userid'];
        $userName = $this->userManager->getUsernameFromUserId($userId);
        if ($userName === false) {
            $this->siteLogger->error("Can't get username from user Id at "
                    . "logout attempt", ['userId' => $userId]);
        }
        $this->siteLogger->info('Logout', ['user' => $userName]);
        session_unset();
        session_destroy();
        $response = FigResponseCookies::expire($response, $this->cookieName);
        return $response->withHeader('Location',$this->router->urlFor('home'))
            ->withStatus(302);
    }

    public function authenticateDataApiRequest(Request $request, RequestHandlerInterface $handler) {
        $this->container->set(ApmContainerKey::API_USER_ID, 0);
        //$this->logger->debug("DataApi headers", $request->getHeaders());
        return $handler->handle($request);
    }
    
    
    public function authenticateApiRequest (Request $request, RequestHandlerInterface $handler)
    {
        if ($this->debugMode) {
            $this->profiler->start();
        }
        $userId = $this->getUserIdFromLongTermCookie($request);
        if ($userId === false){
            $this->apiLogger->notice("Authentication fail");
            $response = new \Slim\Psr7\Response();
            return $response->withStatus(401);
        }
        $this->debug('API : Success, go ahead!');
        $this->container->set(ApmContainerKey::API_USER_ID, $userId);
        if ($this->debugMode) {
            $this->profiler->stop();
            $this->debug("Profiler", $this->profiler->getLaps());
        }
        return $handler->handle($request);
    }
    
    private function getUserIdFromLongTermCookie(Request $request)
    {
        //$this->debug('Checking long term cookie');
        $longTermCookie = FigRequestCookies::get($request, $this->cookieName);
        if ($longTermCookie !== NULL and $longTermCookie->getValue()){
            $cookieValue = $longTermCookie->getValue();
            list($userId, $token, $mac) = explode(':', $cookieValue);
            if (hash_equals($this->generateMac($userId . ':' . $token), $mac)) {
                $userToken = $this->userManager->getUserToken(
                        $userId, 
                        $request->getHeader('User-Agent')[0], 
                        $request->getServerParams()['REMOTE_ADDR']
                );
                if (hash_equals($userToken, $token)){
                    //$this->debug('Cookie looks good, user = ' . $userId);
                    return $userId;
                }
                $this->debug('User tokens do not match -> ' . $userToken . 
                        ' vs ' . $token);
                return false;
            } 
            $this->debug('Macs do not match!');
            return false;
        }
        $this->debug('There is no long term cookie. Fail!');
        return false;
    }
    
}